import { CommandContext } from '../CommandContext';
import { SuppressorType } from '../constants/SuppressorType';

import { CommandDefinition } from './CommandDefinition';
import { AnySubCommandOption } from './CommandOption';

export interface Suppressor {
	/** Suppressor Type */
	suppressor: SuppressorType | string;

	/** Supressor Function. Return of string or true will prevent execution */
	suppress(ctx: CommandContext, option?: SuppressorOption, ...args: Array<any>): Promise<string | false>;
}

export type SuppressorOption = CommandDefinition | AnySubCommandOption;

export type SuppressorDefinition<T = unknown> = (SuppressorType | string) | {
	type: SuppressorType | string,
	args?: Array<T> | (() => Promise<Array<T>>),
};
