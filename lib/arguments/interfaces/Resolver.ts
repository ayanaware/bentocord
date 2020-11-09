import { CommandContext } from '../../commands';
import { ArgumentType } from '../constants';

export type ResolverFn<T> = (ctx: CommandContext, phrase: string, ...extra: Array<any>) => T | Promise<T>;

export interface Resolver<T> {
	type: ArgumentType;
	fn: ResolverFn<T>;
}
