import { ApplicationCommandOptionType } from 'discord-api-types';

import { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import { CommandOption } from '../interfaces/CommandOption';
import { OptionResolver } from '../interfaces/OptionResolver';

export class StringResolver implements OptionResolver<string> {
	public type: OptionType.STRING;
	public convert: ApplicationCommandOptionType.String;

	public async resolve(ctx: CommandContext, option: CommandOption, input: string): Promise<string> {
		return input;
	}
}
