import type { OptionType } from '../constants/OptionType';

import type { SuppressorDefinition } from './Suppressor';

export interface CommandOption<T = unknown> {
	/** Option type */
	type?: OptionType | string;

	/** Option name */
	name: string;

	/** Option description */
	description?: string;

	/** Expect user to input array and always return array */
	array?: boolean;

	/** Is this option required? */
	required?: boolean;

	/** Default value if none can be resolved */
	default?: T;

	/** Array of Choices */
	choices?: Array<CommandOptionChoice>;

	/** Nested Options */
	options?: Array<AnyCommandOption>;

	/** Consume the "rest" of available phrases */
	rest?: boolean;

	/** Limit how many phrases "rest" will consume */
	limit?: number;
}

export interface CommandOptionChoice {
	name: string;
	value: string | number;
}

export interface SubCommandOption extends Omit<CommandOption, 'choices'|'options'> {
	type: OptionType.SUB_COMMAND;

	/** Nested Options */
	options: Array<CommandOption>;

	/** Suppressors */
	suppressors: Array<SuppressorDefinition>;
}

export interface SubCommandGroupOption extends Omit<CommandOption, 'choices'> {
	type: OptionType.SUB_COMMAND_GROUP;

	/** Nested Options */
	options: Array<SubCommandOption>;

	/** Suppressors */
	suppressors: Array<SuppressorDefinition>;
}

export type AnyCommandOption = CommandOption | SubCommandOption | SubCommandGroupOption;
export type AnySubCommandOption = SubCommandOption | SubCommandGroupOption;
