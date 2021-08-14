import * as util from 'util';

import { Component, ComponentAPI, Inject, Subscribe, Variable } from '@ayanaware/bento';
import { Logger } from '@ayanaware/logger-api';

import { GuildChannel, Message } from 'eris';

import { BentocordInterface } from '../BentocordInterface';
import { BentocordVariable } from '../BentocordVariable';
import { ArgumentManager } from '../arguments/ArgumentManager';
import { Discord } from '../discord/Discord';
import { DiscordEvent } from '../discord/constants/DiscordEvent';
import { InhibitorManager } from '../inhibitors/InhibitorManager';

import { CommandContext } from './CommandContext';
import type { CommandEntity } from './interfaces/CommandEntity';

const log = Logger.get(null);

export class CommandManager implements Component {
	public name = '@ayanaware/bentocord:CommandManager';
	public api!: ComponentAPI;

	private readonly commands: Map<string, CommandEntity> = new Map();
	private readonly aliases: Map<string, string> = new Map();

	@Variable({ name: BentocordVariable.BENTOCORD_COMMAND_PREFIX, default: 'bentocord' })
	public defaultPrefix: string;

	private selfId: string = null;

	@Inject() private readonly interface: BentocordInterface;

	@Inject() private readonly discord: Discord;

	@Inject() private readonly argumentManager: ArgumentManager;
	@Inject() private readonly inhibitorManager: InhibitorManager;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async onChildLoad(entity: CommandEntity): Promise<void> {
		try {
			this.addCommand(entity);
		} catch (e) {
			log.warn(e);
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async onChildUnload(entity: CommandEntity): Promise<void> {
		try {
			this.removeCommand(entity);
		} catch (e) {
			log.warn(e);
		}
	}

	public findCommandByAlias(alias: string): CommandEntity {
		alias = alias.toLowerCase();

		// check if know command
		const name = this.aliases.get(alias);
		if (name == null) return null;

		// know command, grab it
		const command = this.commands.get(name);
		if (command == null) throw new Error(`Failed to get Command "${name}" for known alias "${alias}"`);

		return command;
	}

	public addCommand(command: CommandEntity): void {
		if (typeof command.execute !== 'function') throw new Error(`${command.name}: Execute must be function`);
		if (typeof command.definition !== 'object') throw new Error(`${command.name}: Definition must be Object`);
		const definition = command.definition;

		if (definition.aliases.length < 1) throw new Error(`${command.name}: At least one alias must be defined`);

		// check if dupe
		// TODO: build a system to replace commands etc
		if (this.commands.has(command.name)) throw new Error(`${command.name}: Command name "${command.name}" already exists`);

		// save command
		this.commands.set(command.name, command);

		// TODO: ensure aliases is a unique array

		// verify no clashing alises
		const clashes = definition.aliases.filter(alias => this.aliases.has(alias));
		if (clashes.length > 0) throw new Error(`${command.name}: Attempted to register pre-existing aliases: "${clashes.join('", "')}"`);

		// regiser aliases
		for (let alias of definition.aliases) {
			alias = alias.toLowerCase();

			// ex: ping => Entity.name
			this.aliases.set(alias, command.name);
		}
	}

	public removeCommand(command: CommandEntity | string): void {
		if (typeof command === 'string') command = this.findCommandByAlias(command);
		if (!command) throw new Error('Failed to find Command');

		// remove any aliases
		for (const [alias, name] of this.aliases.entries()) {
			if (command.name === name) this.aliases.delete(alias);
		}

		// remove reference
		this.commands.delete(command.name);
	}

	private escapePrefix(s: string) {
		return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	@Subscribe(Discord, DiscordEvent.SHARD_READY)
	@Subscribe(Discord, DiscordEvent.SHARD_RESUME)
	private async refreshSelfId() {
		const self = await this.discord.client.getSelf();
		if (self.id) this.selfId = self.id;
	}

	@Subscribe(Discord, DiscordEvent.MESSAGE_CREATE)
	private async handleMessageCreate(message: Message) {
		// Deny messages without content, channel, or author
		if (!message.content || !message.channel || !message.author) return;

		// raw message
		const raw = message.content;

		let prefix = this.defaultPrefix;
		if (message.guildID) {
			const guildPrefix = await this.interface.getPrefix(message.guildID);
			if (guildPrefix) prefix = guildPrefix;
		}

		// escape prefix
		prefix = this.escapePrefix(prefix);

		// first capture group prefix
		let build = `^(?<prefix>${prefix}`;
		// if we have selfId allow mentions
		if (this.selfId) build = `${build}|<(?:@|@!)${this.selfId}>`;
		// find command and arguments
		build = `${build})\\s?(?<alias>[\\w]+)\\s?(?<args>.+)?$`;

		// example of finished regex: `/^(?<prefix>=|<@!?185476724627210241>)\s?(?<command>[\w]+)\s?(?<args>.+)?$/si`
		const matches = new RegExp(build, 'si').exec(raw);

		// message is not a command
		if (!matches) return;
		const alias = matches.groups.alias;

		const command = this.findCommandByAlias(alias);
		if (command === null) return; // command not found

		// CommandDefinition
		const definition = command.definition;

		// CommandContext
		const ctx = new CommandContext(
			command,
			message,
			matches.groups.prefix,
			alias,
			matches.groups.args,
		);

		// Permissions
		if (!await ctx.hasPermission(command.name)) {
			return ctx.messenger.createMessage('Sorry, You lack permission to execute this command.');
		}

		// Inhibitors
		if (Array.isArray(definition.inhibitors)) {
			for (const inhibitor of definition.inhibitors) {
				const result = await this.inhibitorManager.execute(ctx, inhibitor);

				if (result.result !== false) {
					let inhibMessage = 'An Inhibitor';
					if (result.inhibitor) inhibMessage = `Inhibitor \`${result.inhibitor}\``;
					inhibMessage = `${inhibMessage} has halted execution`;

					if (typeof result.result === 'string') inhibMessage = `${inhibMessage}: \`${result.result}\`.`;

					return ctx.messenger.createMessage(inhibMessage);
				}
			}
		}

		// selfPermissions
		if (ctx.guild && Array.isArray(definition.selfPermissions) && definition.selfPermissions.length > 0) {
			const channelPermissions = (ctx.channel as GuildChannel).permissionsOf(this.selfId);
			const guildPermissions = ctx.guild.permissionsOf(this.selfId);

			const unfufilled = [];
			for (const permission of definition.selfPermissions) {
				if (!guildPermissions.has(permission) && !channelPermissions.has(permission)) unfufilled.push(permission);
			}

			if (unfufilled.length > 0) {
				return ctx.messenger.createMessage(`Command \`${alias}\` cannot be executed. The following required permissions must be granted:\`\`\`${unfufilled.join(', ')}\`\`\``);
			}
		}

		// Command Execution
		try {
			// Fulfill Command Arguments
			if (definition.args) ctx.args = await this.argumentManager.fulfill(ctx, definition.args);

			await command.execute(ctx);
			log.debug(`Command "${command.name}" executed by "${ctx.author.id}"`);
		} catch (e) {
			log.error(`Command ${command.name}.execute() error:\n${util.inspect(e)}`);

			if (e instanceof Error) {
				return ctx.messenger.createMessage(`There was an error executing this command:\`\`\`${e.message}\`\`\``);
			}
		}
	}
}
