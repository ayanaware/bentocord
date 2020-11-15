import { CommandContext } from '../../commands';
import { ArgumentType } from '../constants';
import { Argument } from './Argument';

export type ResolverFn<T> = (ctx: CommandContext, arg: Argument, phrases: Array<string>, ...args: any) => T | Promise<T>;

export interface Resolver<T> {
	type: ArgumentType;
	fn: ResolverFn<T>;
}
