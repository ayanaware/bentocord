import { CommandContext } from '../../commands';
import { ArgumentMatch, ArgumentType } from '../constants';
import { ArgumentPrompt } from './ArgumentPrompt';

export interface Argument<T extends any = any> {
	name: string;
	type: ArgumentType;
	/** ArgumentMatch method to use */
	match?: ArgumentMatch;

	/** Available on FLAG ArgumentMatch method */
	flags?: Array<string>;

	/** Available on STRING and STRINGS ArgumentType */
	choices?: Array<string> | ((ctx: CommandContext, arg: Argument) => Array<string> | Promise<Array<string>>);

	/** Define option argument is associated with */
	option?: string;

	/** Default value if none can be resolved */
	default?: T;

	/** If this argument optional? */
	optional?: boolean;

	/** Consume the "rest" of available phrases */
	rest?: boolean;

	/** Limit how many phrases "rest" will consume */
	limit?: number;

	prompt?: ArgumentPrompt;

	/** Define custom phrase seperators */
	phraseSeperators?: Array<string>;

	/** Transform function. This is the last thing to run before argument is fully processed */
	transform?: string | ((i: T) => T);

	/** If we fail to resolve, then print this */
	unresolved?: string | ((ctx: CommandContext, arg: Argument) => string);
}
