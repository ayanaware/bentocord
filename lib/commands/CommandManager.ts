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
import { PromptManager } from '../prompt/PromptManager';
import { PromptChoice } from '../prompt/prompts/ChoicePrompt';

import { CommandContext, InteractionCommandContext, MessageCommandContext } from './CommandContext';
import { OptionType } from './constants/OptionType';
import { SuppressorType } from './constants/SuppressorType';
import type { Command } from './interfaces/Command';
import type { AnyCommandOption, AnySubCommandOption, AnyValueCommandOption, CommandOptionChoiceCallable } from './interfaces/CommandOption';
import type { Resolver } from './interfaces/Resolver';
import type { Suppressor, SuppressorOption } from './interfaces/Suppressor';
import type { CommandEntity } from './interfaces/entity/CommandEntity';
import type { ResolverEntity } from './interfaces/entity/ResolverEntity';
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

const { ApplicationCommandTypes, ApplicationCommandOptionTypes } = Constants;

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
				this.addCommand(entity as CommandEntity);
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
	 * Add command
	 * @param command Command
	 */
	public addCommand(command: Command): void {
		if (typeof command.execute !== 'function') throw new Error('Execute must be a function');
		if (typeof command.definition !== 'object') throw new Error('Definition must be an object');
		const definition = command.definition;

		if (definition.aliases.length < 1) throw new Error('At least one alias must be defined');
		// ensure all aliases are lowercase
		definition.aliases = definition.aliases.map(a => a.toLocaleLowerCase());

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
		if (alias) alias = alias.toLocaleLowerCase();

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
	 * Convert all slash supporting Bentocord commands to Discord ApplicationCommand
	 * @returns Array of ApplicationCommand
	 */
	public async convertCommands(): Promise<Array<ApplicationCommand>> {
		const collector: Array<ApplicationCommand> = [];

		for (const command of this.commands.values()) {
			const definition = command.definition;
			if (!definition || typeof definition.registerSlash === 'boolean' && !definition.registerSlash) continue;

			const [first, ...rest] = definition.aliases;
			collector.push(await this.convertCommand(first));

			// slash top-level alias support
			if (rest.length > 0 && definition.slashAliases) {
				for (const alias of rest) {
					collector.push(await this.convertCommand(alias));
				}
			}
		}

		return collector;
	}

	/**
	 * Convert Bentocord Command into Discord ApplicationCommand
	 * @param command
	 */
	public async convertCommand(name: string): Promise<ApplicationCommand> {
		const command = this.findCommand(name);
		if (!command) throw new Error(`Failed to find Command "${name}"`);

		const definition = command.definition;
		if (!definition) throw new Error(`Command "${name}" lacks definition`);

		if (typeof definition.registerSlash === 'boolean' && !definition.registerSlash) throw new Error(`${name}: Command "${definition.aliases[0]}" has disabled slash conversion`);

		let description = definition.description;
		if (typeof description === 'object') description = await this.interface.formatTranslation(description.key, description.repl) || description.backup;

		const appCommand: ApplicationCommandStructure = {
			type: ApplicationCommandTypes.CHAT_INPUT,
			name: definition.aliases[0],
			description,
		};

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
			let name = option.name;
			if (Array.isArray(name)) name = name[0];
			name = name.toLocaleLowerCase();

			// support translated descriptions
			let description = option.description;
			if (typeof description === 'object') description = await this.interface.formatTranslation(description.key, description.repl) || description.backup;

			// Handle Special Subcommand & SubcommandGroup OptionTypes
			if (option.type === OptionType.SUB_COMMAND || option.type === OptionType.SUB_COMMAND_GROUP) {
				const subOption: ApplicationCommandOptionsSubCommand | ApplicationCommandOptionsSubCommandGroup = {
					type: option.type === OptionType.SUB_COMMAND ? ApplicationCommandOptionTypes.SUB_COMMAND : ApplicationCommandOptionTypes.SUB_COMMAND_GROUP,
					name,
					description,
				};

				subOption.options = await this.convertOptions(option.options) as Array<ApplicationCommandOptionsSubCommand | ApplicationCommandOptionsWithValue>;
				collector.push(subOption);

				continue;
			}

			// Convert to Discord ApplicationCommandOptionType
			const resolver = this.resolvers.get(option.type);

			const appOption: ApplicationCommandOption<any> = {
				type: resolver ? resolver.convert : ApplicationCommandOptionTypes.STRING,
				name,
				description,
			};

			// Prepend type information to description
			const typeInfo = this.getTypePreview(option);
			appOption.description = `${typeInfo} ${appOption.description}`;

			// Bentocord Array support
			if (option.array) appOption.type = ApplicationCommandOptionTypes.STRING;

			// choices support
			if ('choices' in option) {
				let choices = option.choices;
				if (typeof choices === 'function') choices = await choices();

				// Temp
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				(appOption as any).choices = choices;
			}

			// required support
			appOption.required = typeof option.required === 'boolean' ? option.required : true;

			// failed to convert option
			if (option.type === null) continue;

			collector.push(appOption);
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

	public async fufillInteractionOptions(ctx: CommandContext, options: Array<AnyCommandOption>, data: CommandInteraction['data']): Promise<Record<string, unknown>> {
		return this.processInteractionOptions(ctx, options, data.options);
	}

	private async processInteractionOptions(ctx: CommandContext, options: Array<AnyCommandOption>, optionData: Array<InteractionDataOptions>) {
		let collector: Record<string, unknown> = {};

		if (!options) options = [];
		if (!optionData) optionData = [];

		for (const option of options) {
			// Handle SubCommand & SubCommandGroup
			if (option.type === OptionType.SUB_COMMAND || option.type === OptionType.SUB_COMMAND_GROUP) {
				let names: string | Array<string> = option.name;
				if (!Array.isArray(names)) names = [names];
				const final = names;
				const primary = final[0];

				const subOptionData = optionData.find(d => final.some(f => f.toLocaleLowerCase() === d.name.toLocaleLowerCase())) as InteractionDataOptionsSubCommand | InteractionDataOptionsSubCommandGroup;
				if (!subOptionData) continue;

				// process suppressors
				const suppressed = await this.executeSuppressors(ctx, option);
				if (suppressed) throw new Error(`Suppressor \`${suppressed.name}\` halted execution: ${suppressed.message}`);

				collector = { ...collector, [primary]: await this.processInteractionOptions(ctx, option.options, subOptionData.options) };
				break;
			}

			const data = optionData.find(d => d.name.toLocaleLowerCase() === option.name.toLocaleLowerCase()) as InteractionDataOptionsWithValue;

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

		let promptSubs: Array<AnySubCommandOption> = [];
		for (const option of options) {
			if (option.type === OptionType.SUB_COMMAND_GROUP || option.type === OptionType.SUB_COMMAND) {
				const subOption = option as AnySubCommandOption;
				let names = subOption.name;
				if (!Array.isArray(names)) names = [names];
				const final = names;
				const primary = final[0];

				// track this suboption for prompt
				promptSubs.push(subOption);

				// phrase is a single element
				const phrase = output.phrases[index];
				// validate arg matches subcommand or group name
				if (!phrase || names.every(n => n.toLocaleLowerCase() !== phrase.value.toLocaleLowerCase())) continue;

				index++;

				// process suppressors
				const suppressed = await this.executeSuppressors(ctx, subOption);
				if (suppressed) throw new Error(`Suppressor \`${suppressed.name}\` halted execution: ${suppressed.message}`);

				// process nested option
				collector = { ...collector, [primary]: await this.processTextOptions(ctx, subOption.options, output, index) };
				promptSubs = []; // collected successfully
				break;
			}

			let value: string;
			const textOption = output.options.find(o => o.key.toLocaleLowerCase() === option.name.toLocaleLowerCase());
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

		// Prompt for subcommand option
		let useSub: string = null;
		if (promptSubs.length > 1) {
			const choices: Array<PromptChoice<string>> = [];
			for (const sub of promptSubs) {
				let names: string | Array<string> = sub.name;
				if (!Array.isArray(names)) names = [names];
				const primary = names[0];

				let description = sub.description;
				if (typeof description === 'object') description = await ctx.formatTranslation(description.key, description.repl) || description.backup;

				choices.push({ value: primary, name: `${primary} - ${description}`, match: [primary] });
			}

			const content = await ctx.formatTranslation('BENTOCORD_PROMPT_SUBCOMMAND') || 'Please select a subcommand:';
			const choice = await ctx.choice(choices, content);
			useSub = choice;
		} else if (promptSubs.length === 1) {
			useSub = promptSubs[0]?.name[0];
		}

		if (useSub) {
			const subOption = options.find(o => {
				let name = o.name;
				if (!Array.isArray(name)) name = [name];

				return name.some(n => n.toLocaleLowerCase() === useSub.toLocaleLowerCase());
			}) as AnySubCommandOption;

			if (subOption) collector = { ...collector, [useSub]: await this.processTextOptions(ctx, subOption.options, output, index) };
		}

		return collector;
	}

	private async resolveOption<T = unknown>(ctx: CommandContext, option: AnyValueCommandOption, raw: string): Promise<T | Array<T>> {
		if (raw === undefined) raw = '';

		// array support
		let inputs: Array<string> = option.array ? raw.split(/,\s?/gi) : [raw];
		inputs = inputs.filter(i => !!i);

		// Auto prompt missing data on required option
		if (inputs.length < 1 && (typeof option.required !== 'boolean' || option.required) && 'choices' in option) {
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
				if (result.length === 1) {
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
			let choices: CommandOptionChoiceCallable<unknown> = option.choices;
			if (typeof choices === 'function') choices = await choices();

			const findChoice = choices.find(c => out && (c.value === out.toString() || c.value === parseInt(out.toString(), 10)));
			if (!findChoice) {
				const content = await ctx.formatTranslation('BENTOCORD_PROMPT_CHOICE_OPTION', { option: option.name }) || `Please select one of the following choices for option \`${option.name}\``;
				out = await ctx.choice<T>(choices.map(c => ({ name: c.name, value: c.value as T, match: [c.name] })), content);
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
			// process suppressors
			const suppressed = await this.executeSuppressors(ctx, definition);
			if (suppressed) {
				const message = await ctx.formatTranslation('BENTOCORD_SUPPRESSOR_HALT', { suppressor: suppressed.name, message: suppressed.message }) || `Execution was halted by \`${suppressed.name}\`: ${suppressed.message}`;
				return ctx.createResponse(message);
			}

			const options = await this.fufillInteractionOptions(ctx, definition.options, data);
			return this.executeCommand(command, ctx, options);
		} catch (e) {
			log.error(`Command "${definition.aliases[0]}" option error:\n${util.inspect(e)}`);

			if (e instanceof Error) {
				return ctx.createResponse(await ctx.formatTranslation('BENTOCORD_COMMAND_ERROR', { error: e.message }) || `There was an error resolving command options: ${e.message}`);
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
		const ctx = new MessageCommandContext(this, this.promptManager, command, message);
		ctx.alias = name;

		try {
			// process suppressors
			const suppressed = await this.executeSuppressors(ctx, definition);
			if (suppressed) {
				const suppressedMessage = await ctx.formatTranslation('BENTOCORD_SUPPRESSOR_HALT', { suppressor: suppressed.name, message: suppressed.message }) || `Execution was halted by \`${suppressed.name}\`: ${suppressed.message}`;
				return ctx.createResponse(suppressedMessage);
			}

			const options = await this.fufillTextOptions(ctx, definition.options, args);
			return this.executeCommand(command, ctx, options);
		} catch (e) {
			log.error(`Command "${definition.aliases[0]}" error:\n${util.inspect(e)}`);

			if (e instanceof Error) {
				return ctx.createResponse(await ctx.formatTranslation('BENTOCORD_COMMAND_ERROR', { error: e.message }) || `There was an error resolving command options: ${e.message}`);
			}
		}
	}
}
