import { CommandContext } from '../../commands';
import { ArgumentMatch, ArgumentType } from '../constants';
import { PromptOptions } from './PromptOptions';

export interface Argument<T extends any = any> {
	name: string;
	type: ArgumentType;
	/** ArgumentMatch method to use */
	match?: ArgumentMatch;

	/** Usable on FLAG ArgumentMatch method */
	flags?: Array<string>;

	/** Define option that argument is associated with */
	option?: string;

	/** Default value if none can be resolved */
	default?: T;
	optional?: boolean;

	/** If we fail to resolve, then print this */
	unresolved?: string | ((ctx: CommandContext, arg: Argument) => string);

	/** Consume the "rest" of available phrases */
	rest?: boolean;

	/** Limit how many phrases "rest" will consume */
	limit?: number;

	prompt?: PromptOptions;

	/** Define custom phrase seperators */
	phraseSeperators?: Array<string>;

	/** Transform function. This is the last thing to run before argument is fully processed */
	transform?: string | ((i: T) => T);

	/** Optional `this` context for transform function */
	transformContext?: any;
}
