import { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';

import { CommandOption } from './CommandOption';

export type OptionResolverFn<T> = (
	ctx: CommandContext,
	option: CommandOption,
	phrases: Array<unknown>,
) => Promise<T>;

export interface OptionResolver<T> {
	type: OptionType;
	fn: OptionResolverFn<T>;
}
