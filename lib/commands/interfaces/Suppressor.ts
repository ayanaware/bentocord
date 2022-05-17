import type { AnyCommandContext } from '../CommandContext';
import type { SuppressorType } from '../constants/SuppressorType';

import type { CommandDefinition } from './CommandDefinition';
import type { AnySubCommandOption } from './CommandOption';

export interface Suppressor {
	/** Suppressor Type */
	suppressor: SuppressorType | string;

	/** Supressor Function. Return of string or true will prevent execution */
	suppress(ctx: AnyCommandContext, option?: SuppressorOption, ...args: Array<any>): Promise<string | false>;
}

export type SuppressorOption = CommandDefinition | AnySubCommandOption;

export type SuppressorDefinition<T = unknown> = (SuppressorType | string) | {
	type: SuppressorType | string,
	args?: Array<T> | (() => Promise<Array<T>>),
};
