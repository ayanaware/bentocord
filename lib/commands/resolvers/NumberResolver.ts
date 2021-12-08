import { Constants } from 'eris';

import { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import { CommandOption } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export class NumberResolver implements Resolver<number> {
	public option = OptionType.NUMBER;
	public convert = Constants.ApplicationCommandOptionTypes.INTEGER;

	public async resolve(ctx: CommandContext, option: CommandOption, text: string): Promise<number> {
		const value = parseInt(text, 10);
		if (Number.isNaN(value)) return null;

		return value;
	}
}
