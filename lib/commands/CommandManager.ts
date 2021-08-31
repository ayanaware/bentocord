import { notDeepStrictEqual } from 'assert';
import * as util from 'util';

import { Component, ComponentAPI, Inject, Subscribe, Variable } from '@ayanaware/bento';
import { Logger } from '@ayanaware/logger-api';

import { GuildChannel, Message } from 'eris';

import { BentocordInterface } from '../BentocordInterface';
import { BentocordVariable } from '../BentocordVariable';
import { Discord } from '../discord/Discord';
import { DiscordEvent } from '../discord/constants/DiscordEvent';

import { CommandContext, InteractionCommandContext, MessageCommandContext } from './CommandContext';
import resolvers from './OptionResolvers';
import { APPLICATION_COMMANDS, APPLICATION_GUILD_COMMANDS } from './constants/API';
import { OptionType } from './constants/OptionType';
import type { CommandEntity } from './interfaces/CommandEntity';
import { CommandOption, SubCommandGroupOption, SubCommandOption } from './interfaces/CommandOption';
import { OptionResolverFn } from './interfaces/OptionResolver';
import { ParsedItem, Parser, ParserOutput } from './internal/Parser';
import { Tokenizer } from './internal/Tokenizer';
import {
	ApplicationCommand,
	ApplicationCommandOption,
	ApplicationCommandOptionType,
	ApplicationCommandType,
} from './structures/ApplicationCommand';
import { Interaction, InteractionData, InteractionDataOption, InteractionType } from './structures/Interaction';

const log = Logger.get(null);
export class CommandManager implements Component {
	public name = '@ayanaware/bentocord:CommandManager';
	public api!: ComponentAPI;

	@Variable({ name: BentocordVariable.BENTOCORD_COMMAND_PREFIX, default: 'bentocord' })
	public defaultPrefix: string;

	@Variable({ name: BentocordVariable.BENTOCORD_APPLICATION_ID, default: null })
	public applicationId: string;

	@Inject() private readonly interface: BentocordInterface;
	@Inject() private readonly discord: Discord;

	private readonly resolvers: Map<string | OptionType, OptionResolverFn<unknown>> = new Map();

	private readonly commands: Map<string, CommandEntity> = new Map();
	private readonly aliases: Map<string, string> = new Map();

	private selfId: string = null;

	public async onLoad(): Promise<void> {
		for (const resolver of resolvers) this.addResolver(resolver.type, resolver.fn);
	}

	public async onChildLoad(entity: CommandEntity): Promise<void> {
		try {
			this.addCommand(entity);
		} catch (e) {
			log.warn(e);
		}
	}

	public async onChildUnload(entity: CommandEntity): Promise<void> {
		try {
			this.removeCommand(entity);
		} catch (e) {
			log.warn(e);
		}
	}

	public addResolver(type: string | OptionType, fn: OptionResolverFn<unknown>): void {
		this.resolvers.set(type, fn);
	}

	public removeResolver(type: string | OptionType): void {
		this.resolvers.delete(type);
	}

	private async executeResolver(ctx: CommandContext, option: CommandOption, phrases: Array<unknown>) {
		const fn = this.resolvers.get(option.type);
		if (!fn) return phrases;

		return fn.call(ctx.command, ctx, option, phrases);
	}

	public addCommand(entity: CommandEntity): void {
		if (typeof entity.execute !== 'function') throw new Error(`${entity.name}: Execute must be a function`);
		if (typeof entity.definition !== 'object') throw new Error(`${entity.name}: Definition must be an object`);
		const definition = entity.definition;

		if (definition.aliases.length < 1) throw new Error(`${entity.name}: At least one alias must be defined`);
		// ensure all aliases are lowercase
		definition.aliases = definition.aliases.map(a => a.toLowerCase());

		// first alias is primary alias
		const primary = definition.aliases[0];

		// check dupes & save
		if (this.commands.has(primary)) throw new Error(`${entity.name}: Command name "${primary}" already exists`);
		this.commands.set(primary, entity);

		// register alias => primary alias
		for (const alias of definition.aliases) {
			if (this.aliases.has(alias)) throw new Error(`${entity.name}: Attempted to register existing alias: ${alias}`);

			this.aliases.set(alias, primary);
		}
	}

	public removeCommand(command: CommandEntity | string): void {
		if (typeof command === 'string') command = this.findCommand(command);
		if (!command) throw new Error('Failed to find Command');

		// remove reference
		this.commands.delete(command.name);
	}

	public findCommand(alias: string): CommandEntity {
		alias = alias.toLowerCase();

		// convert alias to primary alias
		const primary = this.aliases.get(alias);
		if (!primary) return null;

		// get command
		const command = this.commands.get(primary);
		if (!command) return null;

		return command;
	}

	public async executeCommand(command: CommandEntity, ctx: CommandContext, options: Record<string, unknown>): Promise<unknown> {
		const definition = command.definition;

		// selfPermissions
		if (ctx.guild && Array.isArray(definition.selfPermissions) && definition.selfPermissions.length > 0) {
			const channelPermissions = (ctx.channel as GuildChannel).permissionsOf(this.selfId);
			const guildPermissions = ctx.guild.permissionsOf(this.selfId);

			const unfufilled = [];
			for (const permission of definition.selfPermissions) {
				if (!guildPermissions.has(permission) && !channelPermissions.has(permission)) unfufilled.push(permission);
			}

			if (unfufilled.length > 0) {
				return ctx.createResponse(`Command cannot be executed. The following required permissions must be granted:\`\`\`${unfufilled.join(', ')}\`\`\``);
			}
		}

		// Command Execution
		try {
			// TODO: Use Typescript metadata to ensure .execute() and options match

			await command.execute(ctx, options);
			log.debug(`Command "${command.name}" executed by "${ctx.author.id}"`);
		} catch (e) {
			log.error(`Command ${command.name}.execute() error:\n${util.inspect(e)}`);

			if (e instanceof Error) {
				return ctx.createResponse(`There was an error executing this command:\`\`\`${e.message}\`\`\``);
			}
		}
	}

	public async syncCommands(commands: Array<ApplicationCommand>, guildId?: string): Promise<unknown> {
		const applicationId = this.discord.application.id;
		if (!applicationId) throw new Error('Failed to infer application_id');

		const discordCommands = await this.discord.client.requestHandler.request('GET', guildId ? APPLICATION_GUILD_COMMANDS(applicationId, guildId) : APPLICATION_COMMANDS(applicationId), true) as Array<ApplicationCommand>;
		const commandIds: Set<string> = new Set(discordCommands.map(c => c.id));

		const bulkUpdate: Array<ApplicationCommand> = [];
		for (const command of commands) {
			if (guildId) command.guild_id = guildId;

			const discordCommand = discordCommands.find(c => c.name === command.name);
			if (discordCommand) {
				command.id = discordCommand.id;
				commandIds.delete(discordCommand.id); // consumed

				try {
					notDeepStrictEqual(command, discordCommand);
					bulkUpdate.push(command);
				} catch (e) { /* NO-OP */ }

				continue;
			}

			bulkUpdate.push(command);
		}

		// TODO: unconsumed commandIds should be deleted

		return this.discord.client.requestHandler.request('PUT', guildId ? APPLICATION_GUILD_COMMANDS(applicationId, guildId) : APPLICATION_COMMANDS(applicationId), true, bulkUpdate as any);
	}

	public convertCommands(): Array<ApplicationCommand> {
		const collector = [];

		for (const command of this.commands.values()) {
			const definition = command.definition;
			if (!definition || typeof definition.registerSlash === 'boolean' && !definition.registerSlash) continue;

			collector.push(this.convertCommand(definition.aliases[0]));
		}

		return collector;
	}

	/**
	 * Convert Bentocord Command into Discord ApplicationCommand
	 * @param command
	 */
	public convertCommand(name: string): ApplicationCommand {
		const command = this.findCommand(name);
		if (!command) throw new Error(`Failed to find Command "${name}"`);

		const definition = command.definition;
		if (!definition) throw new Error(`Command "${command.name}" lacks definition`);

		if (typeof definition.registerSlash === 'boolean' && !definition.registerSlash) throw new Error(`${command.name}: Command "${definition.aliases[0]}" has disabled slash conversion`);

		// infer application_id
		if (!this.discord.application.id) throw new Error('Failed to find application_id');

		const appCommand: ApplicationCommand = {
			type: ApplicationCommandType.CHAT_INPUT,
			name: definition.aliases[0],
			description: definition.description,

			application_id: this.discord.application.id,
			default_permission: true,
		};

		// convert options
		if (Array.isArray(definition.options)) appCommand.options = this.convertOptions(definition.options);

		return appCommand;
	}

	/**
	 * Convert Bentocord CommandOption to Discord ApplicationCommandOption Counterpart
	 * @param options Array of CommandOptions
	 * @returns ApplicationCommandOption Structure
	 */
	private convertOptions(options: Array<SubCommandGroupOption | SubCommandOption | CommandOption>) {
		const collector: Array<ApplicationCommandOption> = [];

		// drop SubCommandGroupOption & SubCommandOption special types
		for (const option of options as Array<CommandOption>) {
			const appOption: ApplicationCommandOption = { type: null, name: option.name, description: option.description };

			// choices support
			if (option.choices) {
				appOption.choices = [];
				for (const choice of option.choices) {
					appOption.choices.push({ name: choice.name, value: choice.value.toString() });
				}
			}

			// required support
			appOption.required = !!option.required;

			switch (option.type) {
				case OptionType.SUB_COMMAND:
				case OptionType.SUB_COMMAND_GROUP: {
					appOption.type = option.type === OptionType.SUB_COMMAND ? ApplicationCommandOptionType.SUB_COMMAND : ApplicationCommandOptionType.SUB_COMMAND_GROUP;
					appOption.options = this.convertOptions(option.options);
				}

				case OptionType.NUMBER: {
					appOption.type = ApplicationCommandOptionType.NUMBER;
				}

				case OptionType.BOOLEAN: {
					appOption.type = ApplicationCommandOptionType.BOOLEAN;
				}

				case OptionType.USER:
				case OptionType.MEMBER: {
					appOption.type = ApplicationCommandOptionType.USER;
				}

				case OptionType.CHANNEL:
				case OptionType.TEXT_CHANNEL:
				case OptionType.VOICE_CHANNEL: {
					appOption.type = ApplicationCommandOptionType.CHANNEL;
				}

				case OptionType.ROLE: {
					appOption.type = ApplicationCommandOptionType.ROLE;
				}

				default: {
					// default & unresolved types are strings
					appOption.type = ApplicationCommandOptionType.STRING;
				}
			}

			// failed to convert option
			if (option.type === null) continue;

			collector.push(appOption);
		}

		return collector;
	}

	public async fufillInteractionOptions(ctx: CommandContext, options: Array<SubCommandGroupOption | SubCommandOption | CommandOption>, data: InteractionData): Promise<Record<string, unknown>> {
		return this.processInteractionOptions(ctx, options, data.options);
	}

	private async processInteractionOptions(ctx: CommandContext, options: Array<SubCommandGroupOption | SubCommandOption | CommandOption>, interactionOption: Array<InteractionDataOption>) {
		let collector: Record<string, unknown> = {};

		if (!options) options = [];
		if (!interactionOption) interactionOption = [];

		for (const option of options) {
			const data = interactionOption.find(d => d.name === option.name);

			if (option.type === OptionType.SUB_COMMAND || option.type === OptionType.SUB_COMMAND_GROUP) {
				const subOptions = option.options;
				if (typeof subOptions !== 'object') throw new Error('Subcommand or Group options must be defined');

				collector = { ...collector, [option.name]: await this.processInteractionOptions(ctx, subOptions, data ? data.options : null) };

				continue;
			}

			// seperators
			let values: Array<unknown> = [];
			if (data && typeof data.value === 'string' && Array.isArray(option.seperators) && option.seperators.length > 0) {
				const regex = new RegExp(option.seperators.join('|'), 'gi');
				values = data.value.split(regex).map(v => v.trim());
			} else if (data && data.value) {
				values = [data.value];
			}

			values = values.filter(i => !!i);

			collector = { ...collector, [option.name]: await this.resolveOption(ctx, option, values) };
		}

		return collector;
	}

	/**
	 * Matches up input text with options
	 * @param options Array of CommandOption
	 * @param input User input
	 */
	public async fufillTextOptions(ctx: CommandContext, options: Array<SubCommandGroupOption | SubCommandOption | CommandOption>, input: string): Promise<Record<string, unknown>> {
		const tokens = new Tokenizer(input).tokenize();

		// TODO: Build allowedOptions
		const output = new Parser(tokens).parse();

		return this.processTextOptions(ctx, options, output);
	}

	private async processTextOptions(ctx: CommandContext, options: Array<SubCommandGroupOption | SubCommandOption | CommandOption>, output: ParserOutput, index = 0): Promise<Record<string, unknown>> {
		let collector: Record<string, unknown> = {};

		if (!options) options = [];

		for (const option of options) {
			if (option.type === OptionType.SUB_COMMAND_GROUP || option.type === OptionType.SUB_COMMAND) {
				// phrase is a single element
				const phrase = output.phrases[index];
				const subOptions = option.options;
				if (typeof subOptions !== 'object') throw new Error('Subcommand or Group options must be defined');

				// validate arg matches subcommand or group name
				if (option.name !== phrase.value) continue;

				index++;

				// process nested option
				collector = { ...collector, [option.name]: await this.processTextOptions(ctx, subOptions, output, index) };

				continue;
			}

			// option support
			const textOption = output.options.find(o => o.key.toLowerCase() === option.name.toLowerCase());
			if (textOption) {
				// seperators
				let optionValues: Array<string> = [textOption.value];
				if (Array.isArray(option.seperators) && option.seperators.length > 0) {
					const regex = new RegExp(option.seperators.join('|'), 'gi');
					optionValues = textOption.value.split(regex).map(v => v.trim());
				}
				optionValues = optionValues.filter(i => !!i);

				collector = { ...collector, [option.name]: await this.resolveOption(ctx, option, optionValues) };

				continue;
			}

			// phrase
			let phrases: Array<ParsedItem> = [];
			if (option.rest) phrases = output.phrases.slice(index, option.limit || Infinity);
			else if (output.phrases.length > index) phrases = [output.phrases[index]];

			// consume
			index += phrases.length;

			// seperators
			let values: Array<string> = phrases.map(p => p.value);
			if (Array.isArray(option.seperators) && option.seperators.length > 0) {
				const regex = new RegExp(option.seperators.join('|'), 'gi');
				values = phrases.join(' ').split(regex).map(v => v.trim());
			}
			options = options.filter(i => !!i);

			collector = { ...collector, [option.name]: await this.resolveOption(ctx, option, values) };
		}

		return collector;
	}

	private async resolveOption(ctx: CommandContext, option: CommandOption, values: Array<unknown>): Promise<unknown> {
		let value = null;
		if (values.length > 0) value = await this.executeResolver(ctx, option, values);

		// failed to resolve
		if (value == null) {
			// maybe do something here
		}

		// TODO: Prompting

		// default value
		if (value == null && option.default !== undefined) value = option.default;

		// required
		if (value == null && (typeof option.required !== 'boolean' || option.required)) throw new Error(`Failed to resolve required option "${option.name}"`);

		// TODO: Transform function

		return value;
	}

	@Subscribe(Discord, DiscordEvent.SHARD_READY)
	@Subscribe(Discord, DiscordEvent.SHARD_RESUME)
	private async refreshSelfId() {
		const self = await this.discord.client.getSelf();
		if (self.id) this.selfId = self.id;
	}

	@Subscribe(Discord, DiscordEvent.RAW_WS)
	private async handleInteractionCreate(pkt: { op: number, t?: string, d?: Record<string, unknown> }) {
		if (pkt.op !== 0 || pkt.t !== 'INTERACTION_CREATE') return; // Limit to Interaction Create

		// Only handle APPLICATION_COMMAND interactions
		const interaction = pkt.d as unknown as Interaction;
		if (interaction.type !== InteractionType.APPLICATION_COMMAND) return;

		const data = interaction.data;

		const command = this.findCommand(data.name);
		if (!command) return; // command not found

		const definition = command.definition;
		if (!definition.registerSlash) return; // slash disabled

		const ctx = new InteractionCommandContext(command, interaction);

		try {
			const options = await this.fufillInteractionOptions(ctx, definition.options, data);
			console.log(ctx, options);
			return this.executeCommand(command, ctx, options);
		} catch (e) {
			log.error(`Command "${command.name}" option error:\n${util.inspect(e)}`);

			if (e instanceof Error) {
				return ctx.createResponse(`There was an error resolving command options:\`\`\`${e.message}\`\`\``);
			}
		}
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
		prefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		// first capture group prefix
		let build = `^(?<prefix>${prefix}`;
		// if we have selfId allow mentions
		if (this.selfId) build = `${build}|<(?:@|@!)${this.selfId}>`;
		// find command and arguments
		build = `${build})\\s?(?<name>[\\w]+)\\s?(?<args>.+)?$`;

		// example of finished regex: `/^(?<prefix>=|<@!?185476724627210241>)\s?(?<name>[\w]+)\s?(?<args>.+)?$/si`
		const matches = new RegExp(build, 'si').exec(raw);

		// message is not a command
		if (!matches) return;
		const name = matches.groups.name;
		const args = matches.groups.args;

		const command = this.findCommand(name);
		if (!command) return; // command not found

		const definition = command.definition;

		// Execution via prefix was disabled
		if (definition.disablePrefix) return;

		// CommandContext
		const ctx = new MessageCommandContext(command, message);

		try {
			const options = await this.fufillTextOptions(ctx, definition.options, args);
			return this.executeCommand(command, ctx, options);
		} catch (e) {
			log.error(`Command "${command.name}" option error:\n${util.inspect(e)}`);

			if (e instanceof Error) {
				return ctx.createResponse(`There was an error resolving command options:\`\`\`${e.message}\`\`\``);
			}
		}
	}
}
