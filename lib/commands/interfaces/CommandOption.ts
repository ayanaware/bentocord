import { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';

export interface CommandOption<T = unknown> {
	type?: OptionType;

	/** Option name */
	name: string;

	/** Option description */
	description: string;

	/** Is this option required? */
	required?: boolean;

	/** Default value if none can be resolved */
	default?: T;

	/** Array of Choices */
	choices?: Array<CommandOptionChoice>;

	/** Nested Options */
	options?: Array<SubCommandGroupOption | SubCommandOption>;

	/** Seperator used for phrase */
	seperators?: Array<string>;

	/** Consume the "rest" of available phrases */
	rest?: boolean;

	/** Limit how many phrases "rest" will consume */
	limit?: number;
}

export interface CommandOptionChoice {
	name: string;
	value: string | number;
}

export interface SubCommandGroupOption extends Omit<CommandOption, 'choices'> {
	type: OptionType.SUB_COMMAND_GROUP;
	options: Array<SubCommandOption>;

	require: true;
}

export interface SubCommandOption extends Omit<CommandOption, 'choices'|'options'> {
	type: OptionType.SUB_COMMAND;
	options: Array<CommandOption>;

	required: true;

	/** Function or method name to execute */
	execute?: string | ((ctx?: CommandContext) => void);
}
