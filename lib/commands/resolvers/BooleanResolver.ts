import { Constants } from 'eris';
import { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import { CommandOptionBoolean } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export class BooleanResolver implements Resolver<boolean> {
	public option = OptionType.BOOLEAN;
	public convert = Constants.ApplicationCommandOptionTypes.BOOLEAN;

	public async resolve(ctx: CommandContext, option: CommandOptionBoolean, input: string): Promise<boolean> {
		if (/^true|t|yes|y|1$/i.exec(input)) return true;
		if (/^false|f|no|n|0$/i.exec(input)) return false;

		return null;
	}
}
