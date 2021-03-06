import { Constants } from 'eris';

import { AnyCommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import type { CommandOptionValue } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export type BooleanOption = CommandOptionValue<OptionType.BOOLEAN, boolean>;

export class BooleanOptionResolver implements Resolver<boolean> {
	public option = OptionType.BOOLEAN;
	public convert = Constants.ApplicationCommandOptionTypes.BOOLEAN;

	public async resolve(ctx: AnyCommandContext, option: BooleanOption, input: string): Promise<boolean> {
		if (/^true|t|yes|y|1$/i.exec(input)) return true;
		if (/^false|f|no|n|0$/i.exec(input)) return false;

		return null;
	}
}
