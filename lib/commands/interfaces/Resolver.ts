import { ApplicationCommandOptionsWithValue } from 'eris';

import type { AnyCommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';

import type { AnyValueCommandOption } from './CommandOption';

export interface Resolver<T = unknown> {
	/** Bentocord Option Type */
	option: OptionType | string;

	/** Discord CommandOptionType to use */
	convert: ApplicationCommandOptionsWithValue['type'];

	/** Reduce display helper (if you returned array in resolve) */
	reduce?(ctx: AnyCommandContext, option: AnyValueCommandOption, resolved: T): Promise<{ display: string, extra?: string }>;

	/** Resolver function */
	resolve(ctx: AnyCommandContext, option: AnyValueCommandOption, input: string): Promise<T | Array<T>>;
}
