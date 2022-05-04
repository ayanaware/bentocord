import * as util from 'util';

import { Component, ComponentAPI, Inject, Subscribe, Variable } from '@ayanaware/bento';
import { Logger } from '@ayanaware/logger-api';

import {
	AnyInteraction,
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

export interface CommandDetails {
	/** The command */
	command: Command;

	/** Command Definition */
	definition: CommandDefinition;

	/** Command category */
	category?: string;

	/** Command permissions */
	permissions: Array<CommandPermissionDetails>;
}

export interface CommandPermissionDetails {
	/** The permission name */
	permission: string;

	/** Default state of this permission */
	defaults: CommandPermissionDefaults;

	/** Is this a hidden permission */
	hidden: boolean;

	/** Subcommand path for this permission */
	path?: Array<string>;
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

	@Variable({ name: BentocordVariable.BENTOCORD_IGNORE_MODE, default: false })
	public ignoreMode: boolean = false;

	@Inject() private readonly interface: BentocordInterface;
	@Inject() private readonly discord: Discord;

	@Inject() private readonly promptManager: PromptManager;

	private readonly commands: Map<string, CommandDetails> = new Map();
	private readonly aliases: Map<string, string> = new Map();

	private readonly resolvers: Map<OptionType | string, Resolver<unknown>> = new Map();
	private readonly suppressors: Map<SuppressorType | string, Suppressor> = new Map();

	private selfId: string = null;

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
				this.removeCommand(entity as CommandEntity);
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

	public getResolvers(): Map<OptionType | string, Resolver<unknown>> {
		return this.resolvers;
	}

	public findResolver(type: OptionType | string): Resolver<unknown> {
		return this.resolvers.get(type);
	}

	private async executeResolver<T = unknown>(ctx: CommandContext, option: AnyValueCommandOption, input: string) {
		const resolver = this.findResolver(option.type) as Resolver<T>;
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
	 * Get primary name of command alias or option name
	 * @param name string or array of string and translateables. First element is always a string
	 * @returns string
	 */
	public getPrimaryName(name: string | [string, ...Array<string | Translateable>]): string {
		let primary = name;
		if (Array.isArray(primary)) primary = primary[0];

		return primary.toLocaleLowerCase().replace(/\s/g, '');
	}

	/**
	 * Get all translations for a possibly translatable
	 * @param item Array<string | Translatable>
	 * @returns Tuple <string, Array<{ lang: string }>>
	 */
	public async getItemTranslations(items: string | Translateable | Array<string | Translateable>, normalize = false): Promise<Array<[string, Record<string, string>]>> {
		if (!Array.isArray(items)) items = [items];

		const collector: Array<[string, Record<string, string>]> = [];

		for (const item of items) {
			const iteration: [string, Record<string, string>] = ['', {}];

			if (typeof item === 'object') {
				iteration[0] = await this.interface.formatTranslation(item.key, item.repl, {}, item.backup ?? item.key);
				iteration[1] = await this.interface.formatTranslationMap(item.key, item.repl) ?? {};
			} else if (typeof item === 'string') {
				iteration[0] = item;
			}

			if (normalize) {
				// Thx to infinitestory for Discord's validation regex
				iteration[0] = iteration[0].toLocaleLowerCase().replace(/[^-_\p{L}\p{N}\p{sc=Devanagari}\p{sc=Thai}]|\s/gu, '');
				iteration[1] = Object.fromEntries(Object.entries(iteration[1]).map(([k, v]) =>
					[k, v.toLocaleLowerCase().replace(/[^-_\p{L}\p{N}\p{sc=Devanagari}\p{sc=Thai}]|\s/gu, '')]));
			}

			collector.push(iteration);
		}

		return collector;
	}

	/**
	 * Get all commands and their details
	 */
	public getCommands(): Map<string, CommandDetails> {
		return this.commands;
	}

	public getCategorizedCommands(): Map<string, Map<string, CommandDetails>> {
		const out: Map<string, Map<string, CommandDetails>> = new Map();
		for (const [command, details] of this.commands) {
			const category = details.category ?? 'general';
			if (!out.has(category)) out.set(category, new Map());

			out.get(category).set(command, details);
		}

		return out;
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

	/**
	 * Add command
	 * @param command Command
	 */
	public async addCommand(command: Command): Promise<void> {
		if (typeof command.execute !== 'function') throw new Error('Execute must be a function');
		if (typeof command.definition !== 'object') throw new Error('Definition must be an object');
		const definition = command.definition;

		if (definition.name.length < 1) throw new Error('At least one name must be defined');
		const primary = this.getPrimaryName(definition.name);

		// check dupes & save
		if (this.commands.has(primary)) throw new Error(`Command name "${primary}" already exists`);

		// add permissions
		const permissions = this.getPermissionDetails(command);

		const commandDetails: CommandDetails = { command, definition, category: definition.category ?? null, permissions };
		this.commands.set(primary, commandDetails);

		const aliases = await this.getItemTranslations(definition.name, true);

		// register alias => primary alias
		for (const [aliasName, translations] of aliases) {
			// check if alias exists and references a different command
			const existing = this.aliases.get(aliasName);
			if (existing && existing !== primary) throw new Error(`${primary}: Attempted to register existing alias "${aliasName}", which is registered to "${existing}"`);

			this.aliases.set(aliasName, primary);

			// register translations
			for (const [lang, translation] of Object.entries(translations)) {
				const existingTranslation = this.aliases.get(translation);
				if (existingTranslation && existingTranslation !== primary) {
					log.warn(`${primary}: Skipping "${lang}" translation alias "${translation}", because it is already registered to "${existingTranslation}"`);
					continue;
				}

				this.aliases.set(translation, primary);
			}
		}

		// emit event
		this.api.emit(CommandManagerEvent.COMMAND_ADD, command);
	}

	/**
	 * Remove Command
	 * @param command Command
	 */
	public removeCommand(command: Command | string): void {
		if (typeof command === 'string') command = this.findCommand(command);
		if (!command) throw new Error('Failed to find Command');

		const definition = command.definition;

		const primary = this.getPrimaryName(definition.name);

		// remove any aliases
		for (const [alias, name] of this.aliases.entries()) {
			if (name === primary) this.aliases.delete(alias);
		}

		// remove reference
		this.commands.delete(primary);

		// emit event
		this.api.emit(CommandManagerEvent.COMMAND_REMOVE, command);
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

		return command.command;
	}

	/**
	 * Get all valid command related permissions, include all and categories
	 * @returns Map of permission => CommandPermissionDetails
	 */
	public getPermissions(): Map<string, CommandPermissionDetails & { command?: Command, type: 'GROUP' | 'COMMAND' }> {
		const collector = new Map<string, CommandPermissionDetails & { command?: Command, type: 'GROUP' | 'COMMAND'  }>();

		collector.set('all', { permission: 'all', defaults: { user: false, admin: true }, hidden: false, type: 'GROUP' });

		for (const commandDetails of this.commands.values()) {
			const { command, permissions } = commandDetails;
			if (!command) continue;

			// add category permissions
			if (command.definition.category) {
				const category = ['all', command.definition.category].join('.');
				if (!collector.has(category)) collector.set(category, { permission: category, defaults: { user: false, admin: true }, hidden: false, type: 'GROUP' });
			}

			for (const permission of permissions) collector.set(permission.permission, { ...permission, command, type: 'COMMAND' });
		}

		return collector;
	}

	/**
	 * Runs pre-flight checks such as perms & suppressors before executing command
	 * @param command Command
	 * @param ctx CommandContext
	 * @returns boolean, if false you should not execute the command
	 */
	public async prepareCommand(command: Command, ctx: CommandContext): Promise<boolean> {
		const definition = command.definition;

		// process suppressors
		const suppressed = await this.executeSuppressors(ctx, definition);
		if (suppressed) {
			await ctx.createTranslatedResponse('BENTOCORD_SUPPRESSOR_HALT', { suppressor: suppressed.name, message: suppressed.message }, 'Execution was halted by `{suppressed}`: {message}');
			return false;
		}

		// check permission
		const primary = this.getPrimaryName(definition.name);

		const permissionName = definition.permissionName ?? primary;
		const path = [permissionName];

		// check perm for explicit deny
		const [state, type] = await this.checkPermission(ctx, path, definition.permissionDefaults);
		if (type === 'explicit') return state;

		// check category for explicit deny
		if (definition.category) {
			const [group, groupType] = await this.checkPermission(ctx, ['all', definition.category], { user: true, admin: true });
			if (groupType === 'explicit') return group;
		}

		// check all for explicit deny
		const [all, allType] = await this.checkPermission(ctx, ['all'], { user: true, admin: true });
		if (allType === 'explicit') return all;

		// handle implicit deny
		if (!state) return false;

		return true;
	}

	public async executeCommand(command: Command, ctx: CommandContext, options: Record<string, unknown>): Promise<unknown> {
		const definition = command.definition;
		const primary = this.getPrimaryName(definition.name);

		// selfPermissions
		if (ctx.guild && Array.isArray(definition.selfPermissions) && definition.selfPermissions.length > 0) {
			const channelPermissions = (ctx.channel as GuildChannel).permissionsOf(this.selfId);
			const guildPermissions = ctx.guild.permissionsOf(this.selfId);

			const unfufilled = [];
			for (const permission of definition.selfPermissions) {
				if (!guildPermissions.has(permission) && !channelPermissions.has(permission)) unfufilled.push(permission);
			}

			if (unfufilled.length > 0) {
				return ctx.createTranslatedResponse(
					'BENTOCORD_COMMANDMANAGER_MISSING_PERMS', { permissions: unfufilled.join(', ') },
					'Command cannot be executed. The following permissions must be granted:\n```{permissions}```');
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
				return ctx.createTranslatedResponse('BENTOCORD_COMMANDMANAGER_ERROR', { error: e.message },
				'An error occured while executing this command: `{error}`');
			}
		}
	}

	public getPermissionDetails(command: Command): Array<CommandPermissionDetails> {
		const definition = command.definition;

		const collector: Array<CommandPermissionDetails> = [];

		const primary = this.getPrimaryName(definition.name);
		const permissionName = definition.permissionName ?? primary;

		let defaults = definition.permissionDefaults ?? { user: true, admin: true };
		if (typeof defaults === 'boolean') defaults = { user: defaults, admin: false };

		const hidden = definition.hidden ?? false;

		collector.push({ permission: permissionName, defaults, hidden, path: [] });

		// walk options
		const walkOptions = (options: Array<AnyCommandOption> = [], path: Array<string> = [], permPath: Array<string> = []): void => {
			for (const option of (options ?? [])) {
				if (option.type !== OptionType.SUB_COMMAND && option.type !== OptionType.SUB_COMMAND_GROUP) continue;
				const subPrimary = this.getPrimaryName(option.name);
				const subPath = [...path, subPrimary];

				const subName = option.permissionName ?? subPrimary;
				const subPermPath = [...permPath, subName];

				let subDefaults = option.permissionDefaults ?? { user: true, admin: true };
				if (typeof subDefaults === 'boolean') subDefaults = { user: subDefaults, admin: true };

				let subHidden = option.hidden ?? false;
				// if top-levl hidden then we are too
				if (hidden) subHidden = true;

				// add subcommand permissions
				const finalName = [permissionName, ...subPermPath].join('.');
				collector.push({ permission: finalName, defaults: subDefaults, hidden: subHidden, path: subPath });

				if (Array.isArray(option.options)) walkOptions(option.options, subPath, subPermPath);
			}
		};

		walkOptions(definition.options);

		return collector;
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
			if (where === 'global') {
				await ctx.createTranslatedResponse('BENTOCORD_PERMISSION_GLOBAL_DENIED', { permission },
					'Permission `{permission}` is denied globally. As this can only be done by a bot owner, it was likely intentional.');
			} else if (where === 'user') {
				await ctx.createTranslatedResponse('BENTOCORD_PERMISSION_USER_DENIED', { permission },
					'Permission `{permission}` is globally denied for you. As this can only be done by a bot owner, it was likely intentional.');
			} else {
				await ctx.createTranslatedResponse('BENTOCORD_PERMISSION_DENIED', { permission, where },
					'Permission `{permission}` has been denied on the `{where}` level.');
			}

			return [false, 'explicit'];
		}

		// all users have permission
		if (defaults.user) return [true, 'implicit'];

		// user is not allowed to execute this command
		await ctx.createTranslatedResponse('BENTOCORD_PERMISSION_DENIED_DEFAULT', { permission }, 'Permission `{permission}` is denined by default. Please contact a server administrator to grant you this permission.');

		return [false, 'implicit'];
	}

	public getTypePreview(option: AnyValueCommandOption): string {
		// Prepend type information to description
		let typeBuild = '[';
		if (typeof option.type === 'number') typeBuild += OptionType[option.type];
		else typeBuild += option.type;

		// handle array
		if (option.array) typeBuild += ', ...';
		typeBuild += ']';

		return typeBuild;
	}

	public async fufillInteractionOptions(ctx: CommandContext, definition: CommandDefinition, data: CommandInteraction['data']): Promise<Record<string, unknown>> {
		const primary = this.getPrimaryName(definition.name);

		return this.processInteractionOptions(ctx, definition.options, data.options, [primary]);
	}

	private async processInteractionOptions(ctx: CommandContext, options: Array<AnyCommandOption>, optionData: Array<InteractionDataOptions>, path: Array<string> = []) {
		let collector: Record<string, unknown> = {};

		if (!options) options = [];
		if (!optionData) optionData = [];

		for (const option of options) {
			const primary = this.getPrimaryName(option.name);

			// Handle SubCommand & SubCommandGroup
			if (this.isAnySubCommand(option)) {
				const subOptionData = optionData.find(d => primary === d.name.toLocaleLowerCase()) as InteractionDataOptionsSubCommand | InteractionDataOptionsSubCommandGroup;
				if (!subOptionData) continue;

				// check category permission
				const category = ctx.command.definition.category;
				if (category) {
					const [group, type] = await this.checkPermission(ctx, ['all', category], { user: true, admin: true });
					if (!group && type === 'explicit') throw NON_ERROR_HALT;
				}

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

		const primary = this.getPrimaryName(definition.name);

		return this.processTextOptions(ctx, definition.options, output, 0, [primary]);
	}

	private async processTextOptions(ctx: CommandContext, options: Array<AnyCommandOption>, output: ParserOutput, index = 0, path: Array<string> = []): Promise<Record<string, unknown>> {
		let collector: Record<string, unknown> = {};

		if (!options) options = [];

		let promptSubs: Array<AnySubCommandOption> = [];
		for (const option of options) {
			const names = await this.getItemTranslations(option.name, true);
			const primary = names[0][0];

			if (this.isAnySubCommand(option)) {
				// track this suboption for prompt
				promptSubs.push(option);

				// phrase is a single element
				const phrase = output.phrases[index];
				// validate arg matches subcommand or group name
				if (!phrase || names.every(n => n[0] !== phrase.value.toLocaleLowerCase())) continue;

				index++;

				// check category permission
				const category = ctx.command.definition.category;
				if (category) {
					const [group, type] = await this.checkPermission(ctx, ['all', category], { user: true, admin: true });
					if (!group && type === 'explicit') throw NON_ERROR_HALT;
				}

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
				if (sub.hidden ?? false) continue; // don't show hidden subcommands/groups
				const primary = this.getPrimaryName(sub.name);

				let description = sub.description;
				if (typeof description === 'object') description = await ctx.formatTranslation(description.key, description.repl, description.backup);

				choices.push({ value: primary, name: `${primary} - ${description}`, match: [primary] });
			}

			const content = await ctx.formatTranslation('BENTOCORD_PROMPT_SUBCOMMAND', {}, 'Please select a subcommand:');
			const choice = await ctx.choice(choices, content);
			useSub = choice;
		} else if (promptSubs.length === 1) {
			const sub = promptSubs[0];
			const primary = this.getPrimaryName(sub.name);
			useSub = primary;
		}

		if (useSub) {
			for (const option of options) {
				const primary = this.getPrimaryName(option.name);
				if (primary !== useSub.toLocaleLowerCase()) continue;
				if (!this.isAnySubCommand(option)) continue;

				// check category permission
				const category = ctx.command.definition.category;
				if (category) {
					const [group, type] = await this.checkPermission(ctx, ['all', category], { user: true, admin: true });
					if (!group && type === 'explicit') throw NON_ERROR_HALT;
				}

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

		const primary = this.getPrimaryName(option.name);

		// Auto prompt missing data on required option
		if (inputs.length < 1 && (typeof option.required !== 'boolean' || option.required) && !('choices' in option)) {
			const type = this.getTypePreview(option);
			const content = await ctx.formatTranslation('BENTOCORD_PROMPT_OPTION', { option: primary, type },  'Please provide an input for option `{option}` of type `{type}`');
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

			if (choices.length === 0) throw new Error('No choices available for this option.');

			const findChoice = choices.find(c => out && (c.value === out.toString() || c.value === parseInt(out.toString(), 10)));
			if (!findChoice) {
				const content = await ctx.formatTranslation('BENTOCORD_PROMPT_CHOICE_OPTION', { option: primary }, 'Please select one of the following choices for option `{option}`');

				const finalChoices: Array<PromptChoice<number | string>> = [];
				for (const choice of choices) {
					let display = choice.name;
					if (typeof display === 'object') display = await ctx.formatTranslation(display.key, display.repl, display.backup);

					const final = { name: display, value: choice.value, match: [choice.value.toString()] };
					finalChoices.push(final);
				}

				out = await ctx.choice<number | string>(finalChoices, content) as unknown as T;
			}
		}

		// required value
		if ((out == null || (Array.isArray(out) && out.length === 0)) && (typeof option.required !== 'boolean' || option.required)) throw new Error(`Failed to resolve required option "${primary}"`);

		// TODO: Transform function
		return out;
	}

	@Subscribe(Discord, DiscordEvent.SHARD_READY)
	@Subscribe(Discord, DiscordEvent.SHARD_RESUME)
	private async handleShardStateChange() {
		const self = await this.discord.client.getSelf();
		if (self.id) this.selfId = self.id;
	}

	@Subscribe(Discord, DiscordEvent.INTERACTION_CREATE)
	private async handleInteractionCreate(interaction: AnyInteraction) {
		// Only handle APPLICATION_COMMAND interactions
		if (interaction.type !== Constants.InteractionTypes.APPLICATION_COMMAND) return;
		interaction = interaction as CommandInteraction;

		const data = interaction.data;

		let command = this.findCommand(data.name);
		if (!command) {
			const testPrefix = await this.interface.getTestCommandPrefix();
			if (data.name.startsWith(testPrefix)) command = this.findCommand(data.name.replace(new RegExp(`^${testPrefix}`, 'i'), ''));
			if (!command) return; // command or test-command not found
		}

		const definition = command.definition;
		if (typeof definition.registerSlash === 'boolean' && !definition.registerSlash) return; // slash disabled

		const ctx = new InteractionCommandContext(this, this.promptManager, command, interaction);
		ctx.alias = data.name;

		try {
			// prepare context
			await ctx.prepare();

			// handle ignoreMode
			if (this.ignoreMode && !(await ctx.isBotOwner())) {
				log.warn(`Skipped Command "${data.name}" execution by "${ctx.author.id}", because the bot is in ignoreMode.`);
				return;
			}

			// pre-flight checks, perms, suppressors, etc
			if (!(await this.prepareCommand(command, ctx))) return;

			// fufill options
			const options = await this.fufillInteractionOptions(ctx, definition, data);

			return this.executeCommand(command, ctx, options);
		} catch (e) {
			// halt requested (this is lazy, I'll fix it later, probably)
			if (e === NON_ERROR_HALT) return;

			log.error(`Command "${definition.name[0]}" option error:\n${util.inspect(e)}`);

			if (e instanceof Error) {
				return ctx.createTranslatedResponse('BENTOCORD_COMMANDMANAGER_ERROR', { error: e.message }, 'An error occured while executing this command: `{error}`');
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
		const matches = new RegExp(build, 'siu').exec(raw);

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

			// handle ignoreMode
			if (this.ignoreMode && !(await ctx.isBotOwner())) {
				log.warn(`Skipped Command "${name}" execution by "${ctx.author.id}", because the bot is in ignoreMode.`);
				return;
			}

			// pre-flight checks, perms, suppressors, etc
			if (!(await this.prepareCommand(command, ctx))) return;

			// fufill options
			const options = await this.fufillTextOptions(ctx, definition, args);

			return this.executeCommand(command, ctx, options);
		} catch (e) {
			// halt requested (this is lazy, I'll fix it later, probably)
			if (e === NON_ERROR_HALT) return;

			log.error(`Command "${definition.name[0]}" error:\n${util.inspect(e)}`);

			if (e instanceof Error) {
				return ctx.createTranslatedResponse('BENTOCORD_COMMANDMANAGER_ERROR', { error: e.message }, 'An error occured while executing this command: `{error}`');
			}
		}
	}
}
