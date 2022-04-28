import { Constants } from 'eris';

import { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import { CommandOptionString } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export class StringResolver implements Resolver<string> {
	public option = OptionType.STRING;
	public convert = Constants.ApplicationCommandOptionTypes.STRING;

	public async resolve(ctx: CommandContext, option: CommandOptionString, input: string): Promise<string> {
		return input;
	}
}
