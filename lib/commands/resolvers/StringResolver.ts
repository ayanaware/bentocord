import { ApplicationCommandOptionType } from 'discord-api-types';

import { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import { CommandOption } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export class StringResolver implements Resolver<string> {
	public option = OptionType.STRING;
	public convert = ApplicationCommandOptionType.String;

	public async resolve(ctx: CommandContext, option: CommandOption, input: string): Promise<string> {
		return input;
	}
}
