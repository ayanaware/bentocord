import { PossiblyTranslatable } from '../../interfaces/Translatable';
import { OptionType } from '../constants/OptionType';
import type { BigIntegerOption } from '../options/BigIntegerOption';
import type { BooleanOption } from '../options/BooleanOption';
import type { ChannelOption } from '../options/ChannelOption';
import type { EmojiOption } from '../options/EmojiOption';
import type { GuildOption } from '../options/GuildOption';
import type { IntegerOption } from '../options/IntegerOption';
import type { NumberOption } from '../options/NumberOption';
import type { RoleOption } from '../options/RoleOption';
import type { StringOption } from '../options/StringOption';
import type { OptionUser } from '../options/UserOption';

import { CommandPermissionDefaults } from './CommandDefinition';
import type { SuppressorDefinition } from './Suppressor';

export type AnyCommandOption = AnySubCommandOption | AnyValueCommandOption;
export type AnySubCommandOption = CommandOptionSubCommandGroup | CommandOptionSubCommand;
export type AnyValueCommandOption = CommandOptionPrimitive | CommandOptionDiscord | CommandOptionValue<string, unknown>;

export interface CommandOption<T extends OptionType | string> {
	/** The type of the option */
	type: T;

	/** The name of the option */
	name: string | [string, ...Array<PossiblyTranslatable>];

	/** The description of the option */
	description?: PossiblyTranslatable;

	/** Domain-specific options */
	extra?: Record<string, unknown>;
}

export interface CommandOptionValue<T extends OptionType | string, U = unknown> extends CommandOption<T> {
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
	label: PossiblyTranslatable;
	value: T;

	description?: PossiblyTranslatable;
}

export type CommandOptionChoiceCallable<T> = Array<CommandOptionChoice<T>> | (() => Promise<Array<CommandOptionChoice<T>>>);

// SUBCOMMAND GROUP
export interface CommandOptionSubCommandGroup extends CommandOption<OptionType.SUB_COMMAND_GROUP> {
	/** The description of the option */
	description: PossiblyTranslatable;

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
	description: PossiblyTranslatable;

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
export type CommandOptionPrimitive =
	BooleanOption |
	IntegerOption |
	StringOption |
	NumberOption |
	BigIntegerOption;

// DISCORD
export type CommandOptionDiscord =
	OptionUser |
	ChannelOption |
	RoleOption |
	EmojiOption |
	GuildOption;

