import { Constants } from 'eris';

import { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import type { CommandOptionValue } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export type BigIntegerOption = CommandOptionValue<OptionType.BIG_INTEGER, bigint>;

export class BigIntegerOptionResolver implements Resolver<bigint> {
	public option = OptionType.BIG_INTEGER;
	public convert = Constants.ApplicationCommandOptionTypes.STRING;

	public async resolve(ctx: CommandContext, option: BigIntegerOption, text: string): Promise<bigint> {
		try {
			return BigInt(text);
		} catch {
			return null;
		}
	}
}
