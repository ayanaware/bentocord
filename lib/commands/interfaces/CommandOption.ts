import { AnyGuildChannel, Emoji, Guild, Member, Role, User } from 'eris';

import { Translateable } from '../../interfaces/Translateable';
import type { OptionType } from '../constants/OptionType';

import type { SuppressorDefinition } from './Suppressor';

export type AnyCommandOption = AnySubCommandOption | AnyValueCommandOption;
export type AnySubCommandOption = CommandOptionSubCommandGroup | CommandOptionSubCommand;
export type AnyValueCommandOption = CommandOptionPrimitive | CommandOptionDiscord;

export interface CommandOption<T extends OptionType | string> {
	/** The type of the option */
	type: T;

	/** The name of the option */
	name: string | Array<string>;

	/** The description of the option */
	description: string | Translateable;
}

export interface CommandOptionValue<T extends OptionType, U = unknown> extends CommandOption<T> {
	name: string;

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
	name: string;
	value: T;
}

export type CommandOptionChoiceCallable<T> = Array<CommandOptionChoice<T>> | (() => Promise<Array<CommandOptionChoice<T>>>);

// SUBCOMMAND GROUP
export interface CommandOptionSubCommandGroup extends CommandOption<OptionType.SUB_COMMAND_GROUP> {
	/** The subcommands of the option */
	options: Array<CommandOptionSubCommand>;

	/** Any suppressors to execute */
	suppressors?: Array<SuppressorDefinition>;
}

// SUBCOMMAND
export interface CommandOptionSubCommand extends CommandOption<OptionType.SUB_COMMAND> {
	/** The subcommands of the option */
	options: Array<AnyValueCommandOption>;

	/** Any suppressors to execute */
	suppressors?: Array<SuppressorDefinition>;
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
export type CommandOptionChannel = CommandOptionValue<OptionType.CHANNEL, AnyGuildChannel>;

// ROLE
export type CommandOptionRole = CommandOptionValue<OptionType.ROLE, Role>;

// GUILD
export type CommandOptionGuild = CommandOptionValue<OptionType.GUILD, Guild>;

// EMOJI
export type CommandOptionEmoji = CommandOptionValue<OptionType.EMOJI, Emoji>;
