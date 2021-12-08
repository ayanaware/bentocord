import type { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';

import type { CommandOption } from './CommandOption';

import { ApplicationCommandOptionsWithValue } from 'eris';

export interface Resolver<T> {
	/** Bentocord Option Type */
	option: OptionType | string;

	/** Discord CommandOptionType to use */
	convert: ApplicationCommandOptionsWithValue['type'];

	/** Reduce display helper (if you returned array in resolve) */
	reduce?(ctx: CommandContext, option: CommandOption<T>, resolved: T): Promise<{ display: string, extra?: string }>;

	/** Resolver function */
	resolve(ctx: CommandContext, option: CommandOption<T>, input: string): Promise<T | Array<T>>;
}
