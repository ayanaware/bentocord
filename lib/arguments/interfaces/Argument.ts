import { ArgumentType } from '../constants';

export interface Argument<T extends any = any> {
	name: string;
	type: ArgumentType;
	default?: T;
	transform?: string | ((i: T) => T);
}
