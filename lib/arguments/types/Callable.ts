import type { CommandContext } from '../../commands/CommandContext';
import type { Argument } from '../interfaces/Argument';

export type Callable<T, U extends Array<unknown>> = ((...args: U) => T) | T;
export type ArgumentCallable = Callable<string, [CommandContext, Argument]>;
