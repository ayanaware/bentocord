import { ArgumentMatch, ArgumentType } from '../constants';

export interface Argument<T extends any = any> {
	name: string;
	type: ArgumentType;
	default?: T;
	optional?: boolean;

	match?: ArgumentMatch;

	transform?: string | ((i: T) => T);
}
