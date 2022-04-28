import { Constants } from 'eris';

import { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import { CommandOptionInteger } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export class IntegerResolver implements Resolver<number> {
	public option = OptionType.NUMBER;
	public convert = Constants.ApplicationCommandOptionTypes.INTEGER;

	public async resolve(ctx: CommandContext, option: CommandOptionInteger, text: string): Promise<number> {
		const value = parseInt(text, 10);
		if (Number.isNaN(value)) return null;

		return value;
	}
}
