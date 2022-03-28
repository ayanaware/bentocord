import { Component, ComponentAPI, Inject, Subscribe } from '@ayanaware/bento';
import { Logger } from '@ayanaware/logger-api';

import {
	ApplicationCommand,
	ApplicationCommandOption,
	ApplicationCommandOptions,
	ApplicationCommandOptionsSubCommand,
	ApplicationCommandOptionsSubCommandGroup,
	ApplicationCommandOptionsWithValue,
	ApplicationCommandStructure,
	Constants,
} from 'eris';

import { BentocordInterface } from '../BentocordInterface';
import { BentocordVariable } from '../BentocordVariable';
import { Discord } from '../discord/Discord';
import { DiscordEvent } from '../discord/constants/DiscordEvent';

import { CommandManager } from './CommandManager';
import { OptionType } from './constants/OptionType';
import { Command } from './interfaces/Command';
import { AnyCommandOption } from './interfaces/CommandOption';

const { ApplicationCommandTypes, ApplicationCommandOptionTypes } = Constants;

export interface SyncOptions {
	/** Should unspecified commands be removed */
	delete?: boolean | string;
	/** Register in this guild or globally */
	guildId?: string;
}

const log = Logger.get();
export class SlashManager implements Component {
	public name = '@ayanaware/bentocord:SlashManager';
	public api!: ComponentAPI;

	@Inject() private readonly interface: BentocordInterface;
	@Inject() private readonly discord: Discord;
	@Inject() private readonly cm: CommandManager;

	private hasSynced = false;

	/**
	 * Sync test- prefixed Slash Commands with TestGuilds
	 */
	public async syncTestGuildCommands(): Promise<void> {
		// get test guild list
		const testGuilds = this.api.getVariable<string>({ name: BentocordVariable.BENTOCORD_TEST_GUILDS, default: '' }).split(',').map(g => g.trim()).filter(v => !!v);
		if (testGuilds.length < 1) return;

		const testPrefix = await this.interface.getTestCommandPrefix();

		// prefix commands with test-
		let commands = await this.convertCommands();
		commands = commands.map(c => ({ ...c, name: `${testPrefix}${c.name}` }));

		for (const guildId of testGuilds) {
			await this.syncCommands(commands, { delete: testPrefix, guildId });
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

		for (const [, details] of this.cm.getCommands()) {
			const command = details.command;

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
		const names = await this.cm.getItemTranslations(definition.name, true);
		const primary = names[0][0];

		// Since we only need one translated name for discord, we merge all
		// translation objects together, with accumulator overriding next object
		const translations: Record<string, string> = names.reduce((a, v) => Object.assign({}, v, a), {});

		// support translated descriptions
		const [description] = await this.cm.getItemTranslations(definition.description);

		const appCommand: ApplicationCommandStructure = {
			type: ApplicationCommandTypes.CHAT_INPUT,
			name: primary,
			description: description[0],
		};

		// add name localizations (convert for discord needed)
		if (Object.keys(translations).length > 0) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			(appCommand as any).name_localizations = await this.interface.convertTranslationMap(translations);
		}

		// add description localizations (convert for discord needed)
		if (Object.keys(description[1]).length > 0) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			(appCommand as any).description_localizations = await this.interface.convertTranslationMap(description[1]);
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
			const names = await this.cm.getItemTranslations(option.name, true);
			const primary = names[0][0];

			// Since we only need one translated name for discord, we merge all
			// translation objects together, with accumulator overriding next object
			const translations: Record<string, string> = names.reduce((a, v) => Object.assign({}, v, a), {});

			// support translated descriptions
			const [description] = await this.cm.getItemTranslations(option.description);
			if (!description[0]) description[0] = primary;

			// Handle Special Subcommand & SubcommandGroup OptionTypes
			if (this.cm.isAnySubCommand(option)) {
				const subOption: ApplicationCommandOptionsSubCommand | ApplicationCommandOptionsSubCommandGroup = {
					type: option.type === OptionType.SUB_COMMAND ? ApplicationCommandOptionTypes.SUB_COMMAND : ApplicationCommandOptionTypes.SUB_COMMAND_GROUP,
					name: primary,
					description: description[0],
				};

				// add name localizations (convert for discord needed)
				if (Object.keys(translations).length > 0) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					(subOption as any).name_localizations = await this.interface.convertTranslationMap(translations);
				}

				// add description localizations (convert for discord needed)
				if (Object.keys(description[1]).length > 0) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					(subOption as any).description_localizations = await this.interface.convertTranslationMap(description[1]);
				}

				subOption.options = await this.convertOptions(option.options) as Array<ApplicationCommandOptionsSubCommand | ApplicationCommandOptionsWithValue>;
				collector.push(subOption);

				continue;
			}

			// Convert to Discord ApplicationCommandOptionType
			const resolver = this.cm.findResolver(option.type);

			const appOption: ApplicationCommandOption<any> = {
				type: resolver ? resolver.convert : ApplicationCommandOptionTypes.STRING,
				name: primary,
				description: description[0],
			};

			// Prepend type information to description
			const typeInfo = this.cm.getTypePreview(option);
			appOption.description = `${typeInfo} ${appOption.description}`;

			// add name localizations (convert for discord needed)
			if (Object.keys(translations).length > 0) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				(appOption as any).name_localizations = await this.interface.convertTranslationMap(translations);
			}

			// add description localizations (convert for discord needed)
			if (Object.keys(description[1]).length > 0) {
				// prepend type information to description
				description[1] = Object.fromEntries(Object.entries(description[1]).map(([key, value]) => [key, `${typeInfo} ${value}`]));

				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				(appOption as any).description_localizations = await this.interface.convertTranslationMap(description[1]);
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

	@Subscribe(Discord, DiscordEvent.SHARD_READY)
	@Subscribe(Discord, DiscordEvent.SHARD_RESUME)
	private async handleStateChange(shardId: number) {
		if (this.hasSynced || shardId !== 0) return;

		await this.syncTestGuildCommands();
		this.hasSynced = true;
	}
}
