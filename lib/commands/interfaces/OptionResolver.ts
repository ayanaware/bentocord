import type { ApplicationCommandOptionType } from 'discord-api-types';

import type { CommandContext } from '../CommandContext';
import type { OptionType } from '../constants/OptionType';

import type { CommandOption } from './CommandOption';

export interface OptionResolver<T> {
	/** Bentocord Option Type */
	option: OptionType | string;

	/** Discord CommandOptionType to use */
	convert: ApplicationCommandOptionType;

	/** Reduce display helper (if you returned array in resolve) */
	reduce?(ctx: CommandContext, option: CommandOption<T>, resolved: T): Promise<{ display: string, extra?: string }>;

	/** Resolver function */
	resolve(ctx: CommandContext, option: CommandOption<T>, input: string): Promise<T | Array<T>>;
}
