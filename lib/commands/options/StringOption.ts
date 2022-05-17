import { Constants } from 'eris';

import { AnyCommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import type { CommandOptionChoiceCallable, CommandOptionValue } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export type StringOption = StringOptionWithChoices | StringOptionWithAutocomplete;

export interface StringOptionWithChoices extends CommandOptionValue<OptionType.STRING, string> {
	// ** array of string choices */
	choices?: CommandOptionChoiceCallable<string>;
}

export interface StringOptionWithAutocomplete extends CommandOptionValue<OptionType.STRING, string> {
	/** Autocomplete */
	autocomplete?: true;
}

export class StringOptionResolver implements Resolver<string> {
	public option = OptionType.STRING;
	public convert = Constants.ApplicationCommandOptionTypes.STRING;

	public async resolve(ctx: AnyCommandContext, option: StringOption, input: string): Promise<string> {
		return input;
	}
}
