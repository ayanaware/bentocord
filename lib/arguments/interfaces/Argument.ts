import { ArgumentMatch, ArgumentType } from '../constants';

export interface Argument<T extends any = any> {
	name: string;
	type: ArgumentType;
	match?: ArgumentMatch;

	flags?: Array<string>;
	option?: string;

	/** Consume the "rest" of available phrases */
	rest?: boolean;

	/** Limit how many phrases "rest" will consume */
	limit?: number;

	/** Default value if non can be resolved */
	default?: T;

	optional?: boolean;

	/** Transform function. This is the last thing to run before argument is fully processed */
	transform?: string | ((i: T) => T);

	/** Optional `this` context for transform function */
	transformContext?: any;
}
