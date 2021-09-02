import { ApplicationCommandOptionType } from 'discord-api-types';

import { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import { CommandOption } from '../interfaces/CommandOption';
import { OptionResolver } from '../interfaces/OptionResolver';

export class BooleanResolver implements OptionResolver<boolean> {
	public option = OptionType.BOOLEAN;
	public convert = ApplicationCommandOptionType.Boolean;

	public async resolve(ctx: CommandContext, option: CommandOption<unknown>, input: string): Promise<boolean> {
		if (/^true|yes|y|1$/i.exec(input)) return true;
		if (/^false|no|n|0$/i.exec(input)) return false;

		return null;
	}
}
