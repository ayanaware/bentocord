import type { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';

import type { AnyValueCommandOption, CommandOptionValue } from './CommandOption';

import { ApplicationCommandOptionsWithValue } from 'eris';

export interface Resolver<T> {
	/** Bentocord Option Type */
	option: OptionType | string;

	/** Discord CommandOptionType to use */
	convert: ApplicationCommandOptionsWithValue['type'];

	/** Reduce display helper (if you returned array in resolve) */
	reduce?(ctx: CommandContext, option: AnyValueCommandOption, resolved: T): Promise<{ display: string, extra?: string }>;

	/** Resolver function */
	resolve(ctx: CommandContext, option: AnyValueCommandOption, input: string): Promise<T | Array<T>>;
}
