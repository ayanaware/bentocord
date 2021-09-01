import { ApplicationCommandOptionType } from 'discord-api-types';

import { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import { CommandOption } from '../interfaces/CommandOption';
import { OptionResolver } from '../interfaces/OptionResolver';

export class NumberResolver implements OptionResolver<number> {
	public type = OptionType.NUMBER;
	public convert = ApplicationCommandOptionType.Integer;

	public async resolve(ctx: CommandContext, option: CommandOption, text: string): Promise<number> {
		const value = parseInt(text, 10);
		if (Number.isNaN(value)) return null;

		return value;
	}
}
