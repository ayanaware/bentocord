import * as util from 'util';

import { Component, ComponentAPI, Inject, Subscribe, Variable } from '@ayanaware/bento';
import { Logger } from '@ayanaware/logger-api';

import {
	APIApplicationCommandInteraction,
	APIApplicationCommandInteractionData,
	APIApplicationCommandOption,
	ApplicationCommandOptionType,
	InteractionType,
} from 'discord-api-types';
import { GuildChannel, Message } from 'eris';

import { BentocordInterface } from '../BentocordInterface';
import { BentocordVariable } from '../BentocordVariable';
import { Discord } from '../discord/Discord';
import { DiscordEvent } from '../discord/constants/DiscordEvent';

import { CommandContext, InteractionCommandContext, MessageCommandContext } from './CommandContext';
import { APPLICATION_COMMANDS, APPLICATION_GUILD_COMMANDS } from './constants/API';
import { OptionType } from './constants/OptionType';
import { SuppressorType } from './constants/SuppressorType';
import { ApplicationCommand, ApplicationCommandOption } from './interfaces/ApplicationCommand';
import { Command } from './interfaces/Command';
import { AnyCommandOption, AnySubCommandOption, CommandOption } from './interfaces/CommandOption';
import { InteractionDataOption } from './interfaces/Interaction';
import { OptionResolver } from './interfaces/OptionResolver';
import { Suppressor, SuppressorOption } from './interfaces/Suppressor';
import type { CommandEntity } from './interfaces/entity/CommandEntity';
import type { OptionResolverEntity } from './interfaces/entity/OptionResolverEntity';
import type { SuppressorEntity } from './interfaces/entity/SuppressorEntity';
import { ParsedItem, Parser, ParserOutput } from './internal/Parser';
import { Tokenizer } from './internal/Tokenizer';
import { Resolvers } from './resolvers';
import { Suppressors } from './supressors';

export interface SyncOptions {
	/** Should unspecified commands be removed */
	delete?: boolean | string;
	/** Register in this guild or globally */
	guildId?: string;
}

const log = Logger.get(null);
export class CommandManager implements Component {
	public name = '@ayanaware/bentocord:CommandManager';
	public api!: ComponentAPI;

	@Variable({ name: BentocordVariable.BENTOCORD_COMMAND_PREFIX, default: 'bentocord' })
	public defaultPrefix: string;

	@Inject() private readonly interface: BentocordInterface;
	@Inject() private readonly discord: Discord;

	private readonly commands: Map<string, Command> = new Map();
	private readonly aliases: Map<string, string> = new Map();

	private readonly resolvers: Map<OptionType | string, OptionResolver<unknown>> = new Map();
	private readonly suppressors: Map<SuppressorType | string, Suppressor> = new Map();

	private selfId: string = null;

	private readonly testPrefix = 'test-';

	public async onLoad(): Promise<void> {
		// Load built-in resolvers
		Resolvers.forEach(resolver => this.addResolver(resolver));

		// Load built-in suppressors
		Suppressors.forEach(suppressor => this.addSuppressor(suppressor));
	}

	public async onChildLoad(entity: CommandEntity | OptionResolverEntity | SuppressorEntity): Promise<void> {
		try {
			if (typeof (entity as CommandEntity).definition === 'object') {
				this.addCommand(entity as CommandEntity);
			} else if (typeof (entity as OptionResolverEntity).option !== 'undefined') {
				this.addResolver(entity as OptionResolverEntity);
			} else if (typeof (entity as SuppressorEntity).suppressor !== 'undefined') {
				this.addSuppressor((entity as SuppressorEntity));
			}
		} catch (e) {
			log.warn(e.toString());
		}
	}

	public async onChildUnload(entity: CommandEntity | OptionResolverEntity | SuppressorEntity): Promise<void> {
		try {
			if (typeof (entity as CommandEntity).definition === 'object') {
				this.removeCommand(entity as CommandEntity);
			} else if (typeof (entity as OptionResolverEntity).option !== 'undefined') {
				this.removeResolver((entity as OptionResolverEntity).option);
			} else if (typeof (entity as SuppressorEntity).suppressor !== 'undefined') {
				this.removeSuppressor((entity as SuppressorEntity).suppressor);
			}
		} catch (e) {
			log.warn(e.toString());
		}
	}

	/**
	 * Add Resolver
	 * @param resolver OptionResolver
	 */
	public addResolver(resolver: OptionResolver<unknown>): void {
		this.resolvers.set(resolver.option, resolver);
	}

	/**
	 * Remove Resolver
	 * @param type OptionType or string
	 */
	public removeResolver(type: OptionType | string): void {
		this.resolvers.delete(type);
	}

	private async executeResolver<T = unknown>(ctx: CommandContext, option: CommandOption<T>, input: string) {
		const resolver = this.resolvers.get(option.type) as OptionResolver<T>;
		if (!resolver) return null;

		return resolver.resolve(ctx, option, input);
	}

	/**
	 * Add Suppressor
	 * @param suppressor Suppressor
	 */
	public addSuppressor(suppressor: Suppressor): void {
		this.suppressors.set(suppressor.suppressor, suppressor);
	}

	/**
	 * Remove Suppressors
	 * @param type SuppressorType or string
	 */
	public removeSuppressor(type: SuppressorType | string): void {
		this.suppressors.delete(type);
	}

	private async executeSuppressors(ctx: CommandContext, option: SuppressorOption): Promise<{ name: string, message: string } | false> {
		if (!Array.isArray(option.suppressors) || option.suppressors.length < 1) return false;

		for (let definition of option.suppressors) {
			if (typeof definition !== 'object') definition = { type: definition, args: [] };

			// resolve name
			let name = definition.type;
			if (typeof name === 'number') name = SuppressorType[name];
			if (typeof definition.args === 'function') definition.args = await definition.args();
			else if (!Array.isArray(definition.args)) definition.args = [];

			const suppressor = this.suppressors.get(definition.type);
			if (!suppressor) continue;

			const result = await suppressor.suppress(ctx, option, ...definition.args);
			if (result === false) continue;

			return { name, message: result };
		}

		return false;
	}

	/**
	 * Add command
	 * @param command Command
	 */
	public addCommand(command: Command): void {
		if (typeof command.execute !== 'function') throw new Error('Execute must be a function');
		if (typeof command.definition !== 'object') throw new Error('Definition must be an object');
		const definition = command.definition;

		if (definition.aliases.length < 1) throw new Error('At least one alias must be defined');
		// ensure all aliases are lowercase
		definition.aliases = definition.aliases.map(a => a.toLowerCase());

		// first alias is primary alias
		const primary = definition.aliases[0];

		// check dupes & save
		if (this.commands.has(primary)) throw new Error(`Command name "${primary}" already exists`);
		this.commands.set(primary, command);

		// register alias => primary alias
		for (const alias of definition.aliases) {
			if (this.aliases.has(alias)) throw new Error(`${primary}: Attempted to register existing alias: ${alias}`);

			this.aliases.set(alias, primary);
		}
	}

	/**
	 * Remove Command
	 * @param command Command
	 */
	public removeCommand(command: Command | string): void {
		if (typeof command === 'string') command = this.findCommand(command);
		if (!command) throw new Error('Failed to find Command');

		const definition = command.definition;
		const primary = definition.aliases[0];

		// remove any aliases
		for (const [alias, name] of this.aliases.entries()) {
			if (name === primary) this.aliases.delete(alias);
		}

		// remove reference
		this.commands.delete(primary);
	}

	/**
	 * Find Command by alias
	 * @param alias Alias
	 * @returns Command
	 */
	public findCommand(alias: string): Command {
		if (alias) alias = alias.toLowerCase();

		// convert alias to primary alias
		const primary = this.aliases.get(alias);
		if (!primary) return null;

		// get command
		const command = this.commands.get(primary);
		if (!command) return null;

		return command;
	}

	public async executeCommand(command: Command, ctx: CommandContext, options: Record<string, unknown>): Promise<unknown> {
		const definition = command.definition;
		const primary = definition.aliases[0];

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
			log.debug(`Command "${primary}" executed by "${ctx.author.id}"`);
		} catch (e) {
			log.error(`Command ${primary}.execute() error:\n${util.inspect(e)}`);

			if (e instanceof Error) {
				return ctx.createResponse(`There was an error executing this command:\`\`\`${e.message}\`\`\``);
			}
		}
	}

	/**
	 * Sync Slash Commands with Discord
	 * @param commandsIn Array of ApplicationCommand
	 * @param opts SyncOptions
	 * @returns Discord Slash Bulk Update Response Payload
	 */
	public async syncCommands(commandsIn: Array<ApplicationCommand>, opts?: SyncOptions): Promise<unknown> {
		opts = Object.assign({ delete: true, prefix: null }, opts);

		// want to avoid reference weirdness so we preform a deep copy of commands
		// has the added benifit of yeeting any properties / functions we dont care about
		const commands: Array<ApplicationCommand> = JSON.parse(JSON.stringify(commandsIn)) as Array<ApplicationCommand>;

		const applicationId = this.discord.application.id;
		if (!applicationId) throw new Error('Failed to infer application_id');

		// Determine route
		let apiRoute = APPLICATION_COMMANDS(applicationId);
		if (opts.guildId) apiRoute = APPLICATION_GUILD_COMMANDS(applicationId, opts.guildId);

		const discordCommands = await this.discord.client.requestHandler.request('GET', apiRoute, true) as Array<ApplicationCommand>;
		const commandIds: Set<string> = new Set();

		const bulkOverwrite: Array<ApplicationCommand> = [];
		for (const command of commands) {
			if (opts.guildId) command.guild_id = opts.guildId;

			// Update command if it already exists
			const discordCommand = discordCommands.find(c => c.name === command.name);
			if (discordCommand && discordCommand.id) {
				command.id = discordCommand.id;
				commandIds.add(discordCommand.id); // consumed
			}

			bulkOverwrite.push(command);
		}

		// Delete is string... Only delete other commands starting with this string
		if (typeof opts.delete === 'string') {
			for (const discordCommand of discordCommands) {
				if (!discordCommand.name.startsWith(opts.delete)) bulkOverwrite.push(discordCommand);
			}
		} else if ((typeof opts.delete === 'boolean' && !opts.delete) || typeof opts.delete !== 'boolean') {
			for (const discordCommand of discordCommands) {
				if (!Array.from(commandIds).includes(discordCommand.id)) {
					bulkOverwrite.push(discordCommand);
					commandIds.add(discordCommand.id);
				}
			}
		}

		return this.discord.client.requestHandler.request('PUT', apiRoute, true, bulkOverwrite as any);
	}

	/**
	 * Sync test- prefixed Slash Commands with TestGuilds
	 */
	public async syncTestGuildCommands(): Promise<void> {
		// get test guild list
		const testGuilds = this.api.getVariable<string>({ name: BentocordVariable.BENTOCORD_TEST_GUILDS, default: '' }).split(',').map(g => g.trim()).filter(v => !!v);
		if (testGuilds.length < 1) return;

		// prefix commands with test-
		const commands = this.convertCommands().map(c => ({ ...c, name: `${this.testPrefix}${c.name}` }));
		for (const guildId of testGuilds) {
			await this.syncCommands(commands, { delete: this.testPrefix, guildId });
		}

		log.info(`Successfully synced "${commands.length}" slash commnads in: "${testGuilds.join(', ')}"`);
	}

	/**
	 * Convert all slash supporting Bentocord commands to Discord ApplicationCommand
	 * @returns Array of ApplicationCommand
	 */
	public convertCommands(): Array<ApplicationCommand> {
		const collector: Array<ApplicationCommand> = [];

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
		if (!definition) throw new Error(`Command "${name}" lacks definition`);

		if (typeof definition.registerSlash === 'boolean' && !definition.registerSlash) throw new Error(`${name}: Command "${definition.aliases[0]}" has disabled slash conversion`);

		// infer application_id
		const applicationId = this.discord.application.id;
		if (!applicationId) throw new Error('Failed to find application_id');

		const appCommand: ApplicationCommand = {
			name: definition.aliases[0],
			description: definition.description,

			// eslint-disable-next-line @typescript-eslint/naming-convention
			application_id: applicationId,
			// eslint-disable-next-line @typescript-eslint/naming-convention
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
	private convertOptions(options: Array<AnyCommandOption>) {
		const collector: Array<APIApplicationCommandOption> = [];

		// drop SubCommandGroupOption & SubCommandOption special types
		for (const option of options as Array<CommandOption>) {
			const appOption: ApplicationCommandOption = { type: null, name: option.name.toLowerCase(), description: option.description };

			// Handle Special Subcommand & SubcommandGroup OptionTypes
			if (option.type === OptionType.SUB_COMMAND || option.type === OptionType.SUB_COMMAND_GROUP) {
				appOption.type = option.type === OptionType.SUB_COMMAND ? ApplicationCommandOptionType.Subcommand : ApplicationCommandOptionType.SubcommandGroup;
				appOption.options = this.convertOptions(option.options);

				collector.push(appOption);

				continue;
			}

			// Convert to Discord ApplicationCommandOptionType
			const resolver = this.resolvers.get(option.type);
			appOption.type = resolver ? resolver.convert : ApplicationCommandOptionType.String;

			// Prepend type information to description
			const typeInfo = this.getTypePreview(option);
			appOption.description = `${typeInfo} ${appOption.description}`;

			// Bentocord Array support
			if (option.array) appOption.type = ApplicationCommandOptionType.String;

			// choices support
			if (option.choices) appOption.choices = option.choices;

			// required support
			appOption.required = typeof option.required === 'boolean' ? option.required : true;

			// failed to convert option
			if (option.type === null) continue;

			collector.push(appOption);
		}

		return collector;
	}

	private getTypePreview(option: CommandOption) {
		// Prepend type information to description
		let typeBuild = '[';
		if (typeof option.type === 'number') typeBuild += OptionType[option.type];
		else typeBuild += option.type;

		// handle array
		if (option.array) typeBuild += ', ...';
		typeBuild += ']';

		return typeBuild;
	}

	public async fufillInteractionOptions(ctx: CommandContext, options: Array<AnyCommandOption>, data: APIApplicationCommandInteractionData): Promise<Record<string, unknown>> {
		return this.processInteractionOptions(ctx, options, data.options);
	}

	private async processInteractionOptions(ctx: CommandContext, options: Array<AnyCommandOption>, optionData: Array<InteractionDataOption>) {
		let collector: Record<string, unknown> = {};

		if (!options) options = [];
		if (!optionData) optionData = [];

		for (const option of options) {
			const data = optionData.find(d => d.name.toLowerCase() === option.name.toLowerCase());

			// Handle SubCommand & SubCommandGroup
			if (option.type === OptionType.SUB_COMMAND || option.type === OptionType.SUB_COMMAND_GROUP) {
				if (!data) continue;
				const subOption = option as AnySubCommandOption;

				// process suppressors
				const suppressed = await this.executeSuppressors(ctx, subOption);
				if (suppressed) throw new Error(`Suppressor \`${suppressed.name}\` halted execution: ${suppressed.message}`);

				collector = { ...collector, [option.name]: await this.processInteractionOptions(ctx, subOption.options, data.options) };
				break;
			}

			const value: string = data?.value.toString();
			collector = { ...collector, [option.name]: await this.resolveOption(ctx, option, value) };
		}

		return collector;
	}

	/**
	 * Matches up input text with options
	 * @param options Array of CommandOption
	 * @param input User input
	 */
	public async fufillTextOptions(ctx: CommandContext, options: Array<AnyCommandOption>, input: string): Promise<Record<string, unknown>> {
		const tokens = new Tokenizer(input).tokenize();

		// TODO: Build allowedOptions
		const output = new Parser(tokens).parse();

		return this.processTextOptions(ctx, options, output);
	}

	private async processTextOptions(ctx: CommandContext, options: Array<AnyCommandOption>, output: ParserOutput, index = 0): Promise<Record<string, unknown>> {
		let collector: Record<string, unknown> = {};

		if (!options) options = [];

		let subNames = [];
		for (const option of options) {
			if (option.type === OptionType.SUB_COMMAND_GROUP || option.type === OptionType.SUB_COMMAND) {
				const subOption = option as AnySubCommandOption;

				subNames.push(subOption.name);

				// phrase is a single element
				const phrase = output.phrases[index];
				// validate arg matches subcommand or group name
				if (!phrase || subOption.name !== phrase.value) continue;

				index++;

				// process suppressors
				const suppressed = await this.executeSuppressors(ctx, subOption);
				if (suppressed) throw new Error(`Suppressor \`${suppressed.name}\` halted execution: ${suppressed.message}`);

				// process nested option
				collector = { ...collector, [option.name]: await this.processTextOptions(ctx, subOption.options, output, index) };
				subNames = []; // collected successfully
				break;
			}

			let value: string;
			const textOption = output.options.find(o => o.key.toLowerCase() === option.name.toLowerCase());
			if (textOption) {
				value = textOption.value;
			} else {
				// phrase
				let phrases: Array<ParsedItem> = [];
				if (option.rest) phrases = output.phrases.slice(index, option.limit || Infinity);
				else if (output.phrases.length > index) phrases = [output.phrases[index]];

				// consume
				index += phrases.length;
				value = phrases.map(p => p.value).join(' ');
			}

			collector = { ...collector, [option.name]: await this.resolveOption(ctx, option, value) };
		}

		// Todo: Prompt for subcommand option
		if (subNames.length > 0) throw new Error(`Please choose one of the following subcommands: ${subNames.join(', ')}`);

		return collector;
	}

	private async resolveOption<T = unknown>(ctx: CommandContext, option: CommandOption<T>, raw: string): Promise<T | Array<T>> {
		if (raw === undefined) raw = '';

		// array support
		let inputs: Array<string> = option.array ? raw.split(/,\s?/gi) : [raw];
		inputs = inputs.filter(i => !!i);

		const value: Array<T> = [];
		for (const item of inputs) {
			let result = await this.executeResolver(ctx, option, item);
			if (result == null) {
				// Resolve failed, prompt!
			}

			// Multiple matches, TODO: reduce
			if (Array.isArray(result)) result = result[0];

			if (result != null) value.push(result);
		}

		let out: T | Array<T> = value;

		// unwrap array if need be
		if (!option.array && Array.isArray(out)) out = out[0];

		// default value
		if ((out == null || (Array.isArray(out) && out.length === 0)) && option.default !== undefined) out = option.default;

		// required value
		if ((out == null || (Array.isArray(out) && out.length === 0)) && (typeof option.required !== 'boolean' || option.required)) throw new Error(`Failed to resolve required option "${option.name}"`);

		// TODO: Transform function
		return out;
	}

	// eslint-disable-next-line @typescript-eslint/member-ordering
	private alreadySynced = false;
	@Subscribe(Discord, DiscordEvent.SHARD_READY)
	private async autoSyncTestGuildSlashCommands() {
		if (this.alreadySynced) return;
		this.alreadySynced = true;

		return this.syncTestGuildCommands();
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
		const interaction = pkt.d as unknown as APIApplicationCommandInteraction;
		if (interaction.type !== InteractionType.ApplicationCommand) return;

		const data = interaction.data;

		let command = this.findCommand(data.name);
		if (!command) {
			if (data.name.startsWith(this.testPrefix)) command = this.findCommand(data.name.replace(new RegExp(`^${this.testPrefix}`, 'i'), ''));
			if (!command) return; // command or test-command not found
		}

		const definition = command.definition;
		if (typeof definition.registerSlash === 'boolean' && !definition.registerSlash) return; // slash disabled

		const ctx = new InteractionCommandContext(this.api, command, interaction);
		try {
			// process suppressors
			const suppressed = await this.executeSuppressors(ctx, definition);
			if (suppressed) return ctx.createResponse(`Suppressor \`${suppressed.name}\` halted execution: ${suppressed.message}`);

			const options = await this.fufillInteractionOptions(ctx, definition.options, data);
			return this.executeCommand(command, ctx, options);
		} catch (e) {
			log.error(`Command "${definition.aliases[0]}" option error:\n${util.inspect(e)}`);

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
		const ctx = new MessageCommandContext(this.api, command, message);

		try {
			// process suppressors
			const suppressed = await this.executeSuppressors(ctx, definition);
			if (suppressed) return ctx.createResponse(`Suppressor \`${suppressed.name}\` halted execution: ${suppressed.message}`);

			const options = await this.fufillTextOptions(ctx, definition.options, args);
			return this.executeCommand(command, ctx, options);
		} catch (e) {
			log.error(`Command "${definition.aliases[0]}" error:\n${util.inspect(e)}`);

			if (e instanceof Error) {
				return ctx.createResponse(`There was an error resolving command options:\`\`\`${e.message}\`\`\``);
			}
		}
	}
}
