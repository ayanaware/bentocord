import { AnyGuildChannel, ChannelTypes, Constants, Emoji, Guild, Member, Role, User } from 'eris';

import { Translateable } from '../../interfaces/Translateable';
import { OptionType } from '../constants/OptionType';

import { CommandPermissionDefaults } from './CommandDefinition';
import type { SuppressorDefinition } from './Suppressor';

export type AnyCommandOption = AnySubCommandOption | AnyValueCommandOption;
export type AnySubCommandOption = CommandOptionSubCommandGroup | CommandOptionSubCommand;
export type AnyValueCommandOption = CommandOptionPrimitive | CommandOptionDiscord;

export interface CommandOption<T extends OptionType | string> {
	/** The type of the option */
	type: T;

	/** The name of the option */
	name: string | [string, ...Array<string | Translateable>];

	/** The description of the option */
	description?: string | Translateable;
}

export interface CommandOptionValue<T extends OptionType, U = unknown> extends CommandOption<T> {
	/** The default value of the option */
	default?: U;

	/** If the option is required */
	required?: boolean;

	/** If the option is expected to be an array */
	array?: boolean;

	/** Consume the "rest" of available phrases */
	rest?: boolean;

	/** Limit how many phrases "rest" will consume */
	limit?: number;
}

export interface CommandOptionChoice<T> {
	name: string | Translateable;
	value: T;
}

export type CommandOptionChoiceCallable<T> = Array<CommandOptionChoice<T>> | (() => Promise<Array<CommandOptionChoice<T>>>);

// SUBCOMMAND GROUP
export interface CommandOptionSubCommandGroup extends CommandOption<OptionType.SUB_COMMAND_GROUP> {
	/** The description of the option */
	description: string | Translateable;

	/** The subcommands of the option */
	options: Array<CommandOptionSubCommand>;

	/** Use custom permission name, instead of the first element of name */
	permissionName?: string;

	/** Should this permission be granted, and by extension, the subcommandgroup be executable when no permission overrides exist */
	permissionDefaults?: CommandPermissionDefaults | boolean;

	/** Any suppressors to execute */
	suppressors?: Array<SuppressorDefinition>;

	/** Hide this subcommand group from general users */
	hidden?: boolean;
}

// SUBCOMMAND
export interface CommandOptionSubCommand extends CommandOption<OptionType.SUB_COMMAND> {
	/** The description of the option */
	description: string | Translateable;

	/** The subcommands of the option */
	options?: Array<AnyValueCommandOption>;

	/** Use custom permission name, instead of the first element of name */
	permissionName?: string;

	/** Should this permission be granted, and by extension, the subcommand be executable when no permission overrides exist */
	permissionDefaults?: CommandPermissionDefaults | boolean;

	/** Any suppressors to execute */
	suppressors?: Array<SuppressorDefinition>;

	/** Hide this subcommand from general users */
	hidden?: boolean;
}

// PRIMITIVES
export type CommandOptionPrimitive = CommandOptionBoolean | CommandOptionInteger | CommandOptionNumber | CommandOptionString;

// BOOLEAN
export type CommandOptionBoolean = CommandOptionValue<OptionType.BOOLEAN, boolean>;

// INTEGER
export type CommandOptionInteger = CommandOptionIntegerWithChoices | CommandOptionIntegerWithMinMax | CommandOptionIntegerWithAutocomplete;

export interface CommandOptionIntegerWithChoices extends CommandOptionValue<OptionType.INTEGER, number> {
	/** Array of Integer choices */
	choices?: CommandOptionChoiceCallable<number>;
}

export interface CommandOptionIntegerWithMinMax extends CommandOptionValue<OptionType.INTEGER, number> {
	min?: number;
	max?: number;
}

export interface CommandOptionIntegerWithAutocomplete extends CommandOptionValue<OptionType.INTEGER, number> {
	autocomplete?: true;
}

// NUMBER
export type CommandOptionNumber = CommandOptionNumberWithChoices | CommandOptionNumberWithMinMax | CommandOptionNumberWithAutocomplete;

export interface CommandOptionNumberWithChoices extends CommandOptionValue<OptionType.NUMBER, number> {
	/** Array of Number choices */
	choices?: CommandOptionChoiceCallable<number>;
}

export interface CommandOptionNumberWithMinMax extends CommandOptionValue<OptionType.NUMBER, number> {
	min?: number;
	max?: number;
}

export interface CommandOptionNumberWithAutocomplete extends CommandOptionValue<OptionType.NUMBER, number> {
	autocomplete?: true;
}

// STRING
export type CommandOptionString = CommandOptionStringWithChoices | CommandOptionStringWithAutocomplete;

export interface CommandOptionStringWithChoices extends CommandOptionValue<OptionType.STRING, string> {
	// ** array of string choices */
	choices?: CommandOptionChoiceCallable<string>;
}

export interface CommandOptionStringWithAutocomplete extends CommandOptionValue<OptionType.STRING, string> {
	/** Autocomplete */
	autocomplete?: true;
}

// DISCORD
export type CommandOptionDiscord = CommandOptionUser | CommandOptionGuild | CommandOptionChannel | CommandOptionRole | CommandOptionEmoji;

// USER
export type CommandOptionUser = CommandOptionValue<OptionType.USER, User | Member>;

// CHANNEL
export type CommandOptionChannel = CommandOptionValue<OptionType.CHANNEL, AnyGuildChannel> & { channelTypes?: Array<ChannelTypes> };
// Common channel types helper
export const AllTextChannelTypes = [
	Constants.ChannelTypes.GUILD_TEXT,
	Constants.ChannelTypes.DM,
	Constants.ChannelTypes.GROUP_DM,
	Constants.ChannelTypes.GUILD_NEWS,
	Constants.ChannelTypes.GUILD_STORE,
	Constants.ChannelTypes.GUILD_NEWS_THREAD,
	Constants.ChannelTypes.GUILD_PUBLIC_THREAD,
	Constants.ChannelTypes.GUILD_PRIVATE_THREAD,
];

export const AllVoiceChannelTypes = [
	Constants.ChannelTypes.GUILD_VOICE,
	Constants.ChannelTypes.GUILD_STAGE_VOICE,
];

// ROLE
export type CommandOptionRole = CommandOptionValue<OptionType.ROLE, Role>;

// GUILD
export type CommandOptionGuild = CommandOptionValue<OptionType.GUILD, Guild>;

// EMOJI
export type CommandOptionEmoji = CommandOptionValue<OptionType.EMOJI, Emoji>;
