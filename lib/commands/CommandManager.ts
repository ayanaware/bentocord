import * as util from 'util';

import { Component, ComponentAPI, Inject, Subscribe, Variable } from '@ayanaware/bento';
import { Logger } from '@ayanaware/logger-api';

import {
	AnyInteraction,
	ApplicationCommand,
	ApplicationCommandOption,
	ApplicationCommandOptions,
	ApplicationCommandOptionsSubCommand,
	ApplicationCommandOptionsSubCommandGroup,
	ApplicationCommandOptionsWithValue,
	ApplicationCommandStructure,
	CommandInteraction,
	Constants,
	GuildChannel,
	InteractionDataOptions,
	InteractionDataOptionsSubCommand,
	InteractionDataOptionsSubCommandGroup,
	InteractionDataOptionsWithValue,
	Message,
} from 'eris';

import { BentocordInterface } from '../BentocordInterface';
import { BentocordVariable } from '../BentocordVariable';
import { Discord } from '../discord/Discord';
import { DiscordEvent } from '../discord/constants/DiscordEvent';
import { MessageContext } from '../interfaces/MessageContext';
import { Translateable } from '../interfaces/Translateable';
import { PromptManager } from '../prompt/PromptManager';
import { PromptChoice } from '../prompt/prompts/ChoicePrompt';

import { CommandContext, InteractionCommandContext, MessageCommandContext } from './CommandContext';
import { CommandManagerEvent } from './constants/CommandManagerEvent';
import { OptionType } from './constants/OptionType';
import { SuppressorType } from './constants/SuppressorType';
import type { Command } from './interfaces/Command';
import { CommandDefinition, CommandPermissionDefaults } from './interfaces/CommandDefinition';
import type {
	AnyCommandOption,
	AnySubCommandOption,
	AnyValueCommandOption,
	CommandOptionChoiceCallable,
	CommandOptionSubCommand,
	CommandOptionSubCommandGroup,
} from './interfaces/CommandOption';
import type { Resolver } from './interfaces/Resolver';
import type { Suppressor, SuppressorOption } from './interfaces/Suppressor';
import type { CommandEntity } from './interfaces/entity/CommandEntity';
import type { ResolverEntity } from './interfaces/entity/ResolverEntity';
import type { SuppressorEntity } from './interfaces/entity/SuppressorEntity';
import { ParsedItem, Parser, ParserOutput } from './internal/Parser';
import { Tokenizer } from './internal/Tokenizer';
import { Resolvers } from './resolvers';
import { Suppressors } from './supressors';

const { ApplicationCommandTypes, ApplicationCommandOptionTypes } = Constants;

export interface SyncOptions {
	/** Should unspecified commands be removed */
	delete?: boolean | string;
	/** Register in this guild or globally */
	guildId?: string;
}

export interface CommandPermissionDetails {
	/** Default state of this permission */
	defaults: CommandPermissionDefaults;

	/** Command which the permission comes from */
	command: Command;

	/** Subcommand path for this permission */
	path?: Array<string>;
}

export interface CommandItemTranslations {
	main: string;
	translations: Record<string, string>;
}

/**
 * Used to "bubble up" events as a Command executes, when it isn't really an "error"
 */
export const NON_ERROR_HALT = '__NON_ERROR_HALT__';

const log = Logger.get(null);
export class CommandManager implements Component {
	public name = '@ayanaware/bentocord:CommandManager';
	public api!: ComponentAPI;

	@Variable({ name: BentocordVariable.BENTOCORD_COMMAND_PREFIX, default: 'bentocord' })
	public defaultPrefix: string;

	@Inject() private readonly interface: BentocordInterface;
	@Inject() private readonly discord: Discord;

	@Inject() private readonly promptManager: PromptManager;

	private readonly commands: Map<string, Command> = new Map();
	private readonly aliases: Map<string, string> = new Map();
	public readonly permissions: Map<string, CommandPermissionDetails> = new Map();

	private readonly resolvers: Map<OptionType | string, Resolver<unknown>> = new Map();
	private readonly suppressors: Map<SuppressorType | string, Suppressor> = new Map();

	private selfId: string = null;

	private testSynced = false;
	private readonly testPrefix = 'test-';

	public async onLoad(): Promise<void> {
		// Load built-in resolvers
		Resolvers.forEach(resolver => this.addResolver(resolver));

		// Load built-in suppressors
		Suppressors.forEach(suppressor => this.addSuppressor(suppressor));
	}

	public async onChildLoad(entity: CommandEntity | ResolverEntity | SuppressorEntity): Promise<void> {
		try {
			if (typeof (entity as CommandEntity).definition === 'object') {
				return this.addCommand(entity as CommandEntity);
			} else if (typeof (entity as ResolverEntity).option !== 'undefined') {
				this.addResolver(entity as ResolverEntity);
			} else if (typeof (entity as SuppressorEntity).suppressor !== 'undefined') {
				this.addSuppressor((entity as SuppressorEntity));
			}
		} catch (e) {
			log.warn(e.toString());
		}
	}

	public async onChildUnload(entity: CommandEntity | ResolverEntity | SuppressorEntity): Promise<void> {
		try {
			if (typeof (entity as CommandEntity).definition === 'object') {
				return this.removeCommand(entity as CommandEntity);
			} else if (typeof (entity as ResolverEntity).option !== 'undefined') {
				this.removeResolver((entity as ResolverEntity).option);
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
	public addResolver(resolver: Resolver<unknown>): void {
		this.resolvers.set(resolver.option, resolver);
	}

	/**
	 * Remove Resolver
	 * @param type OptionType or string
	 */
	public removeResolver(type: OptionType | string): void {
		this.resolvers.delete(type);
	}

	private async executeResolver<T = unknown>(ctx: CommandContext, option: AnyValueCommandOption, input: string) {
		const resolver = this.resolvers.get(option.type) as Resolver<T>;
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

			let args = definition.args;
			if (typeof definition.args === 'function') args = await definition.args();

			if (!Array.isArray(args)) args = [];

			const suppressor = this.suppressors.get(definition.type);
			if (!suppressor) continue;

			const result = await suppressor.suppress(ctx, option, ...args);
			if (result === false) continue;

			return { name, message: result };
		}

		return false;
	}

	/**
	 * Get prefix for a guild
	 * @param snowflake guildId
	 * @returns prefix
	 */
	public async getPrefix(snowflake?: string): Promise<string> {
		let prefix = this.defaultPrefix;
		if (snowflake) {
			const customPrefix = await this.interface.getPrefix(snowflake);
			if (customPrefix) prefix = customPrefix;
		}

		return prefix;
	}

	/**
	 * Set prefix for a guild
	 * @param snowflake guildId
	 * @param prefix new prefix
	 */
	public async setPrefix(snowflake: string, prefix: string): Promise<void> {
		return this.interface.setPrefix(snowflake, prefix);
	}

	/**
	 * Add command
	 * @param command Command
	 */
	public async addCommand(command: Command): Promise<void> {
		if (typeof command.execute !== 'function') throw new Error('Execute must be a function');
		if (typeof command.definition !== 'object') throw new Error('Definition must be an object');
		const definition = command.definition;

		if (definition.aliases.length < 1) throw new Error('At least one alias must be defined');

		const aliases = await this.getItemTranslations(definition.aliases, true);

		// first alias is primary alias
		const primary = aliases[0];
		const name = primary.main;

		// check dupes & save
		if (this.commands.has(name)) throw new Error(`Command name "${name}" already exists`);
		this.commands.set(name, command);

		// register alias => primary alias
		for (const alias of aliases) {
			const aliasName = alias.main;
			if (this.aliases.has(aliasName)) throw new Error(`${name}: Attempted to register existing alias: ${aliasName}`);

			this.aliases.set(aliasName, name);
		}

		// rebuild permissions
		await this.rebuildPermissions();
	}

	/**
	 * Remove Command
	 * @param command Command
	 */
	public async removeCommand(command: Command | string): Promise<void> {
		if (typeof command === 'string') command = this.findCommand(command);
		if (!command) throw new Error('Failed to find Command');

		const definition = command.definition;

		const aliases = await this.getItemTranslations(definition.aliases, true);
		const primary = aliases[0].main;

		// remove any aliases
		for (const [alias, name] of this.aliases.entries()) {
			if (name === primary) this.aliases.delete(alias);
		}

		// remove reference
		this.commands.delete(primary);

		// rebuild permissions
		await this.rebuildPermissions();
	}

	/**
	 * Find Command by alias
	 * @param alias Alias
	 * @returns Command
	 */
	public findCommand(alias: string): Command {
		if (alias) alias = alias.toLocaleLowerCase();

		// convert alias to primary alias
		const primary = this.aliases.get(alias);
		if (!primary) return null;

		// get command
		const command = this.commands.get(primary);
		if (!command) return null;

		return command;
	}

	/**
	 * Runs pre-flight checks such as perms & suppressors before executing command
	 * @param command Command
	 * @param ctx CommandContext
	 * @returns boolean, if false you should not execute the command
	 */
	public async prepareCommand(command: Command, ctx: CommandContext): Promise<boolean> {
		const definition = command.definition;

		// check permission
		const aliases = await this.getItemTranslations(definition.aliases, true);
		const primary = aliases[0].main;

		const permissionName = definition.permissionName ?? primary;
		const path = [permissionName];

		const [state, type] = await this.checkPermission(ctx, path, definition.permissionDefaults);
		// explicit or implicit deny
		if (!state) return false;

		// implicit allow, check 'all'
		if (state && type === 'implicit') {
			// all permission check
			if (!(await this.checkPermission(ctx, 'all', true))[0]) return false;
		}
		// explicit true, or implicit true & all true

		// process suppressors
		const suppressed = await this.executeSuppressors(ctx, definition);
		if (suppressed) {
			const message = await ctx.formatTranslation('BENTOCORD_SUPPRESSOR_HALT', { suppressor: suppressed.name, message: suppressed.message }) || `Execution was halted by \`${suppressed.name}\`: ${suppressed.message}`;
			await ctx.createResponse(message);
			return false;
		}

		return true;
	}

	public async executeCommand(command: Command, ctx: CommandContext, options: Record<string, unknown>): Promise<unknown> {
		const definition = command.definition;

		const aliases = await this.getItemTranslations(definition.aliases, true);
		const primary = aliases[0].main;

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

			const start = process.hrtime();
			await command.execute(ctx, options);
			const end = process.hrtime(start);

			const nano = end[0] * 1e9 + end[1];
			const mili = nano / 1e6;

			this.api.emit(CommandManagerEvent.COMMAND_SUCCESS, command, ctx, options, mili);
			log.debug(`Command "${primary}" executed by "${ctx.author.id}", took ${mili}ms`);
		} catch (e) {
			this.api.emit(CommandManagerEvent.COMMAND_FAILURE, command, ctx, options, e);
			log.error(`Command ${primary}.execute() error:\n${util.inspect(e)}`);

			if (e instanceof Error) {
				return ctx.createResponse(`There was an error executing this command:\`\`\`${e.message}\`\`\``);
			}
		}
	}

	public async rebuildPermissions(): Promise<Map<string, CommandPermissionDetails>> {
		this.permissions.clear();

		for (const [, command] of this.commands) {
			const definition = command.definition;

			// add top-level command permission
			const aliases = await this.getItemTranslations(definition.aliases, true);
			const permissionName = definition.permissionName ?? aliases[0].main;

			let defaults = definition.permissionDefaults ?? { user: true, admin: true };
			if (typeof defaults === 'boolean') defaults = { user: defaults, admin: false };

			this.permissions.set(permissionName, { defaults, command });

			// walk options
			const walkOptions = async (options: Array<AnyCommandOption> = [], path: Array<string> = [], permPath: Array<string> = []): Promise<unknown> => {
				for (const option of (options ?? [])) {
					if (option.type !== OptionType.SUB_COMMAND && option.type !== OptionType.SUB_COMMAND_GROUP) continue;

					const primary = (await this.getItemTranslations(option.name))[0].main;
					const subPath = [...path, primary];

					const subName = option.permissionName ?? primary;
					const subPermPath = [...permPath, subName];

					let subDefaults = option.permissionDefaults ?? { user: true, admin: true };
					if (typeof subDefaults === 'boolean') subDefaults = { user: subDefaults, admin: true };

					// add subcommand permissions
					const finalName = [permissionName, ...subPermPath].join('.');
					this.permissions.set(finalName, { defaults: subDefaults, command, path: subPath });

					if (Array.isArray(option.options)) return walkOptions(option.options, subPath, subPermPath);
				}
			};

			await walkOptions(definition.options);
		}

		return this.permissions;
	}

	private async checkPermission(ctx: CommandContext, path: string | Array<string>, def?: CommandPermissionDefaults | boolean): Promise<[boolean, 'explicit' | 'implicit']> {
		const permCtx: MessageContext = { userId: ctx.authorId, channelId: ctx.channelId };
		if (ctx.guild) {
			permCtx.guildId = ctx.guildId;
			permCtx.roleIds = ctx.member.roles;
		}

		let permission = path;
		if (Array.isArray(permission)) permission = permission.join('.');

		// handle default
		let defaults = def ?? { user: true, admin: true };
		if (typeof defaults === 'boolean') defaults = { user: defaults, admin: true };

		// if admin default true & member has administrator, bypass checks
		// prevents lockout of administrators
		if (defaults.admin && ctx.member && ctx.member.permissions.has('administrator')) return [true, 'implicit'];

		const [check, where] = await this.interface.checkPermission(permission, permCtx);

		// handle explicit allow/deny
		if (typeof check === 'boolean') {
			// explicit allow
			if (check) return [true, 'explicit'];

			// explicit deny
			const content = await ctx.formatTranslation('BENTOCORD_PERMISSION_DENIED', { permission, where }) || `Permission \`${permission}\` has been denied on the \`${where}\` level.`;
			await ctx.createResponse(content);

			return [false, 'explicit'];
		}

		// all users have permission
		if (defaults.user) return [true, 'implicit'];
		// only admins have permission, verify they are one
		else if (defaults.admin && ctx.member && ctx.member.permissions.has('administrator')) return [true, 'implicit'];

		// user is not allowed to execute this command
		const cntent = await ctx.formatTranslation('BENTOCORD_PERMISSION_DENIED_DEFAULT', { permission }) || `Permission \`${permission}\` is denined by default. Please contact a server administrator to grant you this permission.`;
		await ctx.createResponse(cntent);

		return [false, 'implicit'];
	}

	/**
	 * Sync test- prefixed Slash Commands with TestGuilds
	 */
	public async syncTestGuildCommands(): Promise<void> {
		// get test guild list
		const testGuilds = this.api.getVariable<string>({ name: BentocordVariable.BENTOCORD_TEST_GUILDS, default: '' }).split(',').map(g => g.trim()).filter(v => !!v);
		if (testGuilds.length < 1) return;

		// prefix commands with test-
		let commands = await this.convertCommands();
		commands = commands.map(c => ({ ...c, name: `${this.testPrefix}${c.name}` }));

		for (const guildId of testGuilds) {
			await this.syncCommands(commands, { delete: this.testPrefix, guildId });
		}

		log.info(`Successfully synced "${commands.length}" slash commnads in: "${testGuilds.join(', ')}"`);
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

		// Get existing commands
		let existingCommands: Array<ApplicationCommand> = [];
		if (opts.guildId) existingCommands = await this.discord.client.getGuildCommands(opts.guildId);
		else existingCommands = await this.discord.client.getCommands();

		const commandIds: Set<string> = new Set();

		const bulkOverwrite: Array<ApplicationCommand> = [];
		for (const command of commands) {
			if (opts.guildId) command.guild_id = opts.guildId;

			// Update command if it already exists
			const existing = existingCommands.find(c => c.name === command.name);
			if (existing && existing.id) {
				command.id = existing.id;
				commandIds.add(existing.id); // consumed
			}

			bulkOverwrite.push(command);
		}

		// Delete is string... Only delete other commands starting with this string
		if (typeof opts.delete === 'string') {
			for (const existing of existingCommands) {
				if (!existing.name.startsWith(opts.delete)) bulkOverwrite.push(existing);
			}
		} else if ((typeof opts.delete === 'boolean' && !opts.delete) || typeof opts.delete !== 'boolean') {
			for (const existing of existingCommands) {
				if (!Array.from(commandIds).includes(existing.id)) {
					bulkOverwrite.push(existing);
					commandIds.add(existing.id);
				}
			}
		}

		// Bulk Update
		if (opts.guildId) return this.discord.client.bulkEditGuildCommands(opts.guildId, bulkOverwrite);
		return this.discord.client.bulkEditCommands(bulkOverwrite);
	}

	/**
	 * Convert all slash supporting Bentocord commands to Discord ApplicationCommand
	 * @returns Array of ApplicationCommand
	 */
	public async convertCommands(): Promise<Array<ApplicationCommand>> {
		const collector: Array<ApplicationCommand> = [];

		for (const command of this.commands.values()) {
			const definition = command.definition;
			if (!definition || typeof definition.registerSlash === 'boolean' && !definition.registerSlash) continue;

			const cmd = await this.convertCommand(command);
			collector.push(cmd);
		}

		return collector;
	}

	/**
	 * Convert Bentocord Command into Discord ApplicationCommand
	 * @param command
	 */
	private async convertCommand(command: Command): Promise<ApplicationCommand> {
		const definition = command.definition;
		if (!definition) throw new Error('Command lacks definition');

		// support translated names
		const aliases = await this.getItemTranslations(definition.aliases, true);
		const primary = aliases[0];

		// support translated descriptions
		const description = (await this.getItemTranslations(definition.description))[0];

		const appCommand: ApplicationCommandStructure = {
			type: ApplicationCommandTypes.CHAT_INPUT,
			name: primary.main,
			description: description.main,
		};

		// add name localizations (convert for discord needed)
		if (Object.keys(primary.translations).length > 0) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			(appCommand as any).name_localizations = await this.interface.convertTranslationMap(primary.translations);
		}

		// add description localizations (convert for discord needed)
		if (Object.keys(description.translations).length > 0) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			(appCommand as any).description_localizations = await this.interface.convertTranslationMap(description.translations);
		}

		// convert options
		if (Array.isArray(definition.options)) appCommand.options = await this.convertOptions(definition.options);

		return appCommand as ApplicationCommand;
	}

	/**
	 * Convert Bentocord CommandOption to Discord ApplicationCommandOption Counterpart
	 * @param options Array of CommandOptions
	 * @returns ApplicationCommandOption Structure
	 */
	private async convertOptions(options: Array<AnyCommandOption>): Promise<Array<ApplicationCommandOptions>> {
		const collector: Array<ApplicationCommandOptions> = [];

		if (!options) options = [];
		for (const option of options) {
			// support translated names
			const names = await this.getItemTranslations(option.name, true);
			const primary = names[0];

			// support translated descriptions
			const description = (await this.getItemTranslations(option.description))[0];
			if (!description.main) description.main = primary.main;

			// Handle Special Subcommand & SubcommandGroup OptionTypes
			if (this.isAnySubCommand(option)) {
				const subOption: ApplicationCommandOptionsSubCommand | ApplicationCommandOptionsSubCommandGroup = {
					type: option.type === OptionType.SUB_COMMAND ? ApplicationCommandOptionTypes.SUB_COMMAND : ApplicationCommandOptionTypes.SUB_COMMAND_GROUP,
					name: primary.main,
					description: description.main,
				};

				// add name localizations (convert for discord needed)
				if (Object.keys(primary.translations).length > 0) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					(subOption as any).name_localizations = await this.interface.convertTranslationMap(primary.translations);
				}

				// add description localizations (convert for discord needed)
				if (Object.keys(description.translations).length > 0) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					(subOption as any).description_localizations = await this.interface.convertTranslationMap(description.translations);
				}

				subOption.options = await this.convertOptions(option.options) as Array<ApplicationCommandOptionsSubCommand | ApplicationCommandOptionsWithValue>;
				collector.push(subOption);

				continue;
			}

			// Convert to Discord ApplicationCommandOptionType
			const resolver = this.resolvers.get(option.type);

			const appOption: ApplicationCommandOption<any> = {
				type: resolver ? resolver.convert : ApplicationCommandOptionTypes.STRING,
				name: primary.main,
				description: description.main,
			};

			// Prepend type information to description
			const typeInfo = this.getTypePreview(option);
			appOption.description = `${typeInfo} ${appOption.description}`;

			// add name localizations (convert for discord needed)
			if (Object.keys(primary.translations).length > 0) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				(appOption as any).name_localizations = await this.interface.convertTranslationMap(primary.translations);
			}

			// add description localizations (convert for discord needed)
			if (Object.keys(description.translations).length > 0) {
				// prepend type information to description
				description.translations = Object.fromEntries(Object.entries(description.translations).map(([key, value]) => [key, `${typeInfo} ${value}`]));

				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				(appOption as any).description_localizations = await this.interface.convertTranslationMap(description.translations);
			}

			// Bentocord Array support
			if (option.array) appOption.type = ApplicationCommandOptionTypes.STRING;

			// TODO: Stop being lazy, and make this typesafe

			// choices support
			if ('choices' in option) {
				let choices = option.choices;
				if (typeof choices === 'function') choices = await choices();

				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				(appOption as any).choices = choices;
			}

			// min/max support
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if ('min' in option) (appOption as any).min_value = option.min;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if ('max' in option) (appOption as any).max_value = option.max;

			// channel_types support
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if ('channelTypes' in option) (appOption as any).channel_types = option.channelTypes;

			// required support
			appOption.required = typeof option.required === 'boolean' ? option.required : true;

			// failed to convert option
			if (option.type === null) continue;

			collector.push(appOption);
		}

		return collector;
	}

	/**
	 * Get all translations for a possibly translatable
	 * @param item string | Translatable | Array<string | Translatable>
	 * @returns Array of Objects, obj.source = default locale, obj.translations = all other locales keyed by locale
	 */
	public async getItemTranslations(items: string | Translateable | Array<string | Translateable>, normalize = false): Promise<Array<CommandItemTranslations>> {
		if (!Array.isArray(items)) items = [items];

		const collector = [];
		for (let item of items) {
			if (!item) {
				collector.push({ main: '', translations: {} });
				continue;
			} else if (typeof item === 'string') {
				if (normalize) item = item.toLocaleLowerCase();
				collector.push({ main: item, translations: {} });
				continue;
			}

			let main = await this.interface.formatTranslation(item.key, item.repl) ?? item.backup ?? item.key;
			let translations = await this.interface.formatTranslationMap(item.key, item.repl) ?? {};

			if (normalize) {
				main = main.toLocaleLowerCase();
				main = main.replace(/\s/g, '');

				translations = Object.fromEntries(Object.entries(translations).map(([key, value]) => [key, value.toLocaleLowerCase().replace(/\s/g, '')]));
			}

			collector.push({ main, translations });
		}

		return collector;
	}

	private getTypePreview(option: AnyValueCommandOption) {
		// Prepend type information to description
		let typeBuild = '[';
		if (typeof option.type === 'number') typeBuild += OptionType[option.type];
		else typeBuild += option.type;

		// handle array
		if (option.array) typeBuild += ', ...';
		typeBuild += ']';

		return typeBuild;
	}

	public isSubCommand(option: AnyCommandOption): option is CommandOptionSubCommand {
		return option.type === OptionType.SUB_COMMAND;
	}

	public isSubCommandGroup(option: AnyCommandOption): option is CommandOptionSubCommandGroup {
		return option.type === OptionType.SUB_COMMAND_GROUP;
	}

	public isAnySubCommand(option: AnyCommandOption): option is CommandOptionSubCommand | CommandOptionSubCommandGroup {
		return this.isSubCommand(option) || this.isSubCommandGroup(option);
	}

	public async fufillInteractionOptions(ctx: CommandContext, definition: CommandDefinition, data: CommandInteraction['data']): Promise<Record<string, unknown>> {
		const aliases = await this.getItemTranslations(definition.aliases, true);
		const primary = aliases[0].main;

		return this.processInteractionOptions(ctx, definition.options, data.options, [primary]);
	}

	private async processInteractionOptions(ctx: CommandContext, options: Array<AnyCommandOption>, optionData: Array<InteractionDataOptions>, path: Array<string> = []) {
		let collector: Record<string, unknown> = {};

		if (!options) options = [];
		if (!optionData) optionData = [];

		for (const option of options) {
			const names = await this.getItemTranslations(option.name, true);
			const primary = names[0].main;

			// Handle SubCommand & SubCommandGroup
			if (this.isAnySubCommand(option)) {
				const subOptionData = optionData.find(d => names.some(f => f.main === d.name.toLocaleLowerCase())) as InteractionDataOptionsSubCommand | InteractionDataOptionsSubCommandGroup;
				if (!subOptionData) continue;

				// check permission
				const permissionName = option.permissionName ?? primary;
				const subPath = [...path, permissionName];

				if (!(await this.checkPermission(ctx, subPath, option.permissionDefaults))[0]) throw NON_ERROR_HALT;

				// process suppressors
				const suppressed = await this.executeSuppressors(ctx, option);
				if (suppressed) throw new Error(`Suppressor \`${suppressed.name}\` halted execution: ${suppressed.message}`);

				collector = { ...collector, [primary]: await this.processInteractionOptions(ctx, option.options, subOptionData.options, subPath) };
				break;
			}

			const data = optionData.find(d => d.name.toLocaleLowerCase() === primary) as InteractionDataOptionsWithValue;

			const value: string = data?.value.toString();
			collector = { ...collector, [primary]: await this.resolveOption(ctx, option, value) };
		}

		return collector;
	}

	/**
	 * Matches up input text with options
	 * @param options Array of CommandOption
	 * @param input User input
	 */
	public async fufillTextOptions(ctx: CommandContext, definition: CommandDefinition, input: string): Promise<Record<string, unknown>> {
		const tokens = new Tokenizer(input).tokenize();

		// TODO: Build allowedOptions
		const output = new Parser(tokens).parse();

		const aliases = await this.getItemTranslations(definition.aliases, true);
		const primary = aliases[0].main;

		return this.processTextOptions(ctx, definition.options, output, 0, [primary]);
	}

	private async processTextOptions(ctx: CommandContext, options: Array<AnyCommandOption>, output: ParserOutput, index = 0, path: Array<string> = []): Promise<Record<string, unknown>> {
		let collector: Record<string, unknown> = {};

		if (!options) options = [];

		let promptSubs: Array<AnySubCommandOption> = [];
		for (const option of options) {
			const names = await this.getItemTranslations(option.name, true);
			const primary = names[0].main;

			if (this.isAnySubCommand(option)) {
				// track this suboption for prompt
				promptSubs.push(option);

				// phrase is a single element
				const phrase = output.phrases[index];
				// validate arg matches subcommand or group name
				if (!phrase || names.every(n => n.main !== phrase.value.toLocaleLowerCase())) continue;

				index++;

				// check permission
				const permissionName = option.permissionName ?? primary;
				const subPath = [...path, permissionName];

				if (!(await this.checkPermission(ctx, subPath, option.permissionDefaults))[0]) throw NON_ERROR_HALT;

				// process suppressors
				const suppressed = await this.executeSuppressors(ctx, option);
				if (suppressed) throw new Error(`Suppressor \`${suppressed.name}\` halted execution: ${suppressed.message}`);

				// process nested option
				collector = { ...collector, [primary]: await this.processTextOptions(ctx, option.options, output, index, subPath) };
				promptSubs = []; // collected successfully
				break;
			}

			let value: string;
			const textOption = output.options.find(o => o.key.toLocaleLowerCase() === primary.toLocaleLowerCase());
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

			collector = { ...collector, [primary]: await this.resolveOption(ctx, option, value) };
		}

		// Prompt for subcommand option
		let useSub: string = null;
		if (promptSubs.length > 1) {
			const choices: Array<PromptChoice<string>> = [];
			for (const sub of promptSubs) {
				const primary = (await this.getItemTranslations(sub.name, true))[0].main;

				let description = sub.description;
				if (typeof description === 'object') description = await ctx.formatTranslation(description.key, description.repl) || description.backup;

				choices.push({ value: primary, name: `${primary} - ${description}`, match: [primary] });
			}

			const content = await ctx.formatTranslation('BENTOCORD_PROMPT_SUBCOMMAND') || 'Please select a subcommand:';
			const choice = await ctx.choice(choices, content);
			useSub = choice;
		} else if (promptSubs.length === 1) {
			const sub = promptSubs[0];
			const primary = (await this.getItemTranslations(sub.name, true))[0].main;
			useSub = primary;
		}

		if (useSub) {
			for (const option of options) {
				const primary = (await this.getItemTranslations(option.name, true))[0].main;
				if (primary !== useSub.toLocaleLowerCase()) continue;
				if (!this.isAnySubCommand(option)) continue;

				// check permission
				const permissionName = option.permissionName ?? primary;
				const subPath = [...path, permissionName];

				if (!(await this.checkPermission(ctx, subPath, option.permissionDefaults))[0]) throw NON_ERROR_HALT;

				if (option) collector = { ...collector, [useSub]: await this.processTextOptions(ctx, option.options, output, index, subPath) };
			}
		}

		return collector;
	}

	private async resolveOption<T = unknown>(ctx: CommandContext, option: AnyValueCommandOption, raw: string): Promise<T | Array<T>> {
		if (raw === undefined) raw = '';

		// array support
		let inputs: Array<string> = option.array ? raw.split(/,\s?/gi) : [raw];
		inputs = inputs.filter(i => !!i);

		// Auto prompt missing data on required option
		if (inputs.length < 1 && (typeof option.required !== 'boolean' || option.required) && !('choices' in option)) {
			const type = this.getTypePreview(option);
			const content = await ctx.formatTranslation('BENTOCORD_PROMPT_OPTION', { option: option.name, type }) || `Please provide an input for option \`${option.name}\` of type \`${type}\`:`;
			const input = await ctx.prompt<string>(content, async (s: string) => s);

			inputs = option.array ? input.split(/,\s?/gi) : [input];
			inputs = inputs.filter(i => !!i);
		}

		const value: Array<T> = [];
		for (const input of inputs) {
			const result = await this.executeResolver<T>(ctx, option, input);

			// Reduce Choose Prompt
			if (Array.isArray(result)) {
				if (result.length === 0) {
					continue;
				} else if (result.length === 1) {
					// single element array
					value.push(result[0]);
					continue;
				}

				const resolver = this.resolvers.get(option.type) as Resolver<T>;

				const choices: Array<PromptChoice<T>> = [];
				for (const item of result) {
					const match = [];
					let display = item.toString();

					if (resolver && typeof resolver.reduce === 'function') {
						const reduce = await resolver.reduce(ctx, option, item);
						display = reduce.display;

						if (reduce.extra) match.push(reduce.extra);
					}

					choices.push({ value: item, name: display, match });
				}

				const choice = await ctx.choice<T>(choices);
				value.push(choice);

				continue;
			}

			if (result != null) value.push(result);
		}

		let out: T | Array<T> = value;

		// unwrap array if need be
		if (!option.array && Array.isArray(out)) out = out[0];

		// default value
		if ((out == null || (Array.isArray(out) && out.length === 0)) && option.default !== undefined) out = option.default as unknown as T;

		// handle choices
		if ('choices' in option) {
			let choices: CommandOptionChoiceCallable<number | string> = option.choices;
			if (typeof choices === 'function') choices = await choices();

			const findChoice = choices.find(c => out && (c.value === out.toString() || c.value === parseInt(out.toString(), 10)));
			if (!findChoice) {
				const content = await ctx.formatTranslation('BENTOCORD_PROMPT_CHOICE_OPTION', { option: option.name }) || `Please select one of the following choices for option \`${option.name}\``;

				const finalChoices: Array<PromptChoice<number | string>> = [];
				for (const choice of choices) {
					const name = await this.getItemTranslations(choice.name);
					const primary = name[0];

					const final = { name: primary.main, value: choice.value, match: [primary.main] };
					if (Object.keys(primary.translations).length > 0) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						(final as any).name_localizations = primary.translations;
					}

					finalChoices.push(final);
				}

				out = await ctx.choice<number | string>(finalChoices, content) as unknown as T;
			}
		}

		// required value
		if ((out == null || (Array.isArray(out) && out.length === 0)) && (typeof option.required !== 'boolean' || option.required)) throw new Error(`Failed to resolve required option "${option.name}"`);

		// TODO: Transform function
		return out;
	}

	@Subscribe(Discord, DiscordEvent.SHARD_READY)
	@Subscribe(Discord, DiscordEvent.SHARD_RESUME)
	private async handleShardStateChange() {
		const self = await this.discord.client.getSelf();
		if (self.id) this.selfId = self.id;

		if (!this.testSynced) {
			await this.syncTestGuildCommands();
			this.testSynced = true;
		}
	}

	@Subscribe(Discord, DiscordEvent.INTERACTION_CREATE)
	private async handleInteractionCreate(interaction: AnyInteraction) {
		// Only handle APPLICATION_COMMAND interactions
		if (interaction.type !== Constants.InteractionTypes.APPLICATION_COMMAND) return;
		interaction = interaction as CommandInteraction;

		const data = interaction.data;

		let command = this.findCommand(data.name);
		if (!command) {
			if (data.name.startsWith(this.testPrefix)) command = this.findCommand(data.name.replace(new RegExp(`^${this.testPrefix}`, 'i'), ''));
			if (!command) return; // command or test-command not found
		}

		const definition = command.definition;
		if (typeof definition.registerSlash === 'boolean' && !definition.registerSlash) return; // slash disabled

		const ctx = new InteractionCommandContext(this, this.promptManager, command, interaction);
		ctx.alias = data.name;

		try {
			// prepare context
			await ctx.prepare();

			// pre-flight checks, perms, suppressors, etc
			if (!(await this.prepareCommand(command, ctx))) return;

			// fufill options
			const options = await this.fufillInteractionOptions(ctx, definition, data);

			return this.executeCommand(command, ctx, options);
		} catch (e) {
			// halt requested (this is lazy, I'll fix it later, probably)
			if (e === NON_ERROR_HALT) return;

			log.error(`Command "${definition.aliases[0]}" option error:\n${util.inspect(e)}`);

			if (e instanceof Error) {
				return ctx.createResponse(await ctx.formatTranslation('BENTOCORD_COMMAND_ERROR', { error: e.message }) || `There was an error resolving command options: ${e.message}`);
			}
		}
	}

	@Subscribe(Discord, DiscordEvent.MESSAGE_CREATE)
	public async handleMessageCreate(message: Message): Promise<any> {
		// Deny messages without content, channel, or author
		if (!message.content || !message.channel || !message.author) return;

		// raw message
		const raw = message.content;

		let prefixes = [this.defaultPrefix];

		// guild prefix override
		if (message.guildID) {
			const guildPrefix = await this.interface.getPrefix(message.guildID);
			if (guildPrefix) prefixes = [guildPrefix];
		}

		// extra prefixes support
		const extraPrefixes = await this.interface.getExtraPrefixes();
		if (Array.isArray(extraPrefixes) && extraPrefixes.length > 0) prefixes = [...prefixes, ...extraPrefixes];

		// escape prefixes
		prefixes = prefixes.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

		// first capture group prefix
		let build = `^(?<prefix>${prefixes.join('|')}`;
		// if we have selfId allow mentions
		if (this.selfId) build = `${build}|<(?:@|@!)${this.selfId}>`;
		// find command and arguments
		build = `${build})\\s?(?<name>[\\w]+)\\s?(?<args>.+)?$`;

		// example of finished regex: `/^(?<prefix>=|<@!?185476724627210241>)\s?(?<name>[\w]+)\s?(?<args>.+)?$/si`
		const matches = new RegExp(build, 'si').exec(raw);

		// message is not a command
		if (!matches) return;
		let name = matches.groups.name;
		let args = matches.groups.args;

		let command = this.findCommand(name);
		if (!command) {
			if (message.guildID && !message.author.bot) {
				const [newName, newArguments] = await this.interface.resolveAlias(name, args, message);
				if (newName) {
					command = this.findCommand(newName);
					if (command) {
						name = newName;
						args = newArguments;
						// continue with normal command execution
					} else {
						return; // command not found
					}
				} else {
					return; // command not found
				}
			} else {
				return; // not in guild, or author is a bot
			}
		}

		const definition = command.definition;

		// Execution via prefix was disabled
		if (definition.disablePrefix) return;

		// CommandContext
		const ctx = new MessageCommandContext(this, this.promptManager, command, message);
		ctx.alias = name;

		try {
			// prepare context
			await ctx.prepare();

			// pre-flight checks, perms, suppressors, etc
			if (!(await this.prepareCommand(command, ctx))) return;

			// fufill options
			const options = await this.fufillTextOptions(ctx, definition, args);

			return this.executeCommand(command, ctx, options);
		} catch (e) {
			// halt requested (this is lazy, I'll fix it later, probably)
			if (e === NON_ERROR_HALT) return;

			log.error(`Command "${definition.aliases[0]}" error:\n${util.inspect(e)}`);

			if (e instanceof Error) {
				return ctx.createResponse(await ctx.formatTranslation('BENTOCORD_COMMAND_ERROR', { error: e.message }) || `There was an error resolving command options: ${e.message}`);
			}
		}
	}
}
