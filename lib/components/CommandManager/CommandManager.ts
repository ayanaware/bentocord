import { BentoError, Component, ComponentAPI, Entity, Inject, Plugin, Subscribe, Variable } from '@ayanaware/bento';
import { Message } from 'eris';

import { Bentocord } from '../../Bentocord';
import { BentocordVariable, DiscordEvent } from '../../constants';
import { Discord } from '../Discord';

import { Command } from './Command';
import { CommandContext } from './CommandContext';

import { Logger } from '@ayanaware/logger-api';
const log = Logger.get(null);

export class CommandManagerError extends BentoError {
	public command: Command;

	public constructor(command: Command, msg: string) {
		super(`${command.name}(command): ${msg}`);
		this.__define('command', command);
	}
}

export class CommandManager implements Component {
	public name = 'CommandManager';
	public api!: ComponentAPI;
	public parent: Plugin = Bentocord;

	private readonly commands: Map<string, Command> = new Map();
	private readonly aliases: Map<string, string> = new Map();

	@Variable({ name: BentocordVariable.BENTOCORD_COMMAND_PREFIX, default: 'bentocord' })
	public defaultPrefix: string;
	private selfId: string = null;

	@Inject(Bentocord)
	private readonly bentocord: Bentocord;

	@Inject(Discord)
	private readonly discord: Discord;

	public async onLoad() {
		// load built-in commands
		const loadBuiltin = this.api.getVariable({ name: BentocordVariable.BENTOCORD_BUILTIN_COMMANDS, default: true });
		if (loadBuiltin) return this.api.loadComponents(this.bentocord.fsLoader, __dirname, 'commands');
	}

	public async onChildLoad(entity: Command) {
		try {
			await this.addCommand(entity);
		} catch (e) {
			log.warn(e);
		}
	}

	public async onChildUnload(entity: Command) {
		try {
			await this.removeCommand(entity);
		} catch (e) {
			log.warn(e);
		}
	}

	public findCommandByAlias(alias: string): Command {
		// check if know command
		const name = this.aliases.get(alias);
		if (name == null) return null;

		// know command, grab it
		const command = this.commands.get(name);
		if (command == null) throw new Error(`Failed to get Command "${name}" for known alias "${alias}"`);

		return command;
	}

	public async addCommand(command: Command) {
		if (typeof command.execute !== 'function') throw new CommandManagerError(command, 'Execute must be a function');
		if (!Array.isArray(command.aliases)) throw new CommandManagerError(command, 'Aliases must be an array');
		if (command.aliases.length < 1) throw new CommandManagerError(command, 'Aliases array must contain at least one element')

		// check if dupe
		// TODO: build a system to replace commands etc
		if (this.commands.has(command.name)) throw new CommandManagerError(command, `Command with name of "${command.name}" already exists`);

		// save command
		this.commands.set(command.name, command);
		
		// TODO: ensure aliases is a unique array

		// verify no clashing alises
		const clashes = command.aliases.filter(alias => this.aliases.has(alias));
		if (clashes.length > 0) throw new CommandManagerError(command, `Attempted to register pre-existing aliases: "${clashes.join('", "')}"`);

		// regiser aliases
		for (let alias of command.aliases) {
			alias = alias.toLowerCase();

			// ex: ping => Entity.name
			this.aliases.set(alias, command.name);
		}
	}

	public async removeCommand(command: Command | string) {
		if (typeof command === 'string') command = this.findCommandByAlias(command);
		if (!command) throw new Error('Failed to find Command');

		// remove any aliases
		for (const [alias, name] of this.aliases.entries()) {
			if (command.name == name) this.aliases.delete(alias);
		}

		// remove reference
		this.commands.delete(command.name);
	}

	private escapePrefix(s: string) {
		return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
	
	public async getPrefix(guildId: string) {
		return (await this.bentocord.storage.get<string>('prefix', guildId)) || this.defaultPrefix;
	}

	public async setPrefix(guildId: string, prefix: string) {
		await this.bentocord.storage.set<string>('prefix', prefix, guildId);
		return prefix;
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
		if (message.guildID) prefix = await this.getPrefix(message.guildID);

		// escape prefix
		prefix = this.escapePrefix(prefix);

		// first capture group prefix
		let build = `^(?<prefix>${prefix}`;
		// if we have selfId allow mentions
		if (this.selfId) build = `${build}|<(?:@|@!)${this.selfId}>`;
		// find command and arguments
		build = `${build})\\s?(?<alias>[\\w]+)\\s?(?<args>.+)?$`

		// example of finished regex: `^(?<prefix>=|<@!?185476724627210241>)\s?(?<command>[\w]+)\s?(?<args>.+)?`
		const matches = new RegExp(build).exec(raw);
		
		// message is not a command
		if (!matches) return;
		const alias = matches.groups.alias;

		const command = this.findCommandByAlias(alias);
		if (command === null) return; // command not found

		let args: Array<string> = [];
		if (matches.groups.args) args = matches.groups.args.split(' ');

		// build CommandContext
		const ctx = new CommandContext(
			message,
			matches.groups.prefix,
			alias,
			args,
		);

		try {
			await command.execute(ctx);
			log.debug(`Command ${command.name} successfully executed by user "${ctx.author.id}"`);
		} catch (e) {
			log.error(`Command ${command.name}.execute() error: ${e}`);

			if (e instanceof Error) {
				await this.discord.client.createMessage(message.channel.id, `There was an error executing this command:\`\`\`${e.message}\`\`\` `)
			}
		}
	}
}
