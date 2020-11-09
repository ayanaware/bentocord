import { CommandContext } from '../../commands';
import { ArgumentType } from '../constants';

export type ResolverFn<T> = (ctx: CommandContext, phrases: Array<string>) => T | Promise<T>;

export interface Resolver<T> {
	type: ArgumentType;
	fn: ResolverFn<T>;
}
