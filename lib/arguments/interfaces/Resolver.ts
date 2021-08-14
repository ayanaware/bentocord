import { CommandContext } from '../../commands/CommandContext';
import { ArgumentType } from '../constants/ArgumentType';

import { Argument } from './Argument';

export type ResolverFn<T> = (
	ctx: CommandContext,
	arg: Argument,
	phrases: Array<string>,
	...args: any) => ResolverResult<T> | Promise<ResolverResult<T>>;

export interface ResolverResult<T> {
	value: T;
	reduce?: boolean;
	reduceDisplay?: (v: T) => string;
	reduceExtra?: (v: T) => string;
}

export interface Resolver<T> {
	type: ArgumentType;
	fn: ResolverFn<T>;
}
