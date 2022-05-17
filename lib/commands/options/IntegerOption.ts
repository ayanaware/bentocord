import { Constants } from 'eris';

import { AnyCommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import type { CommandOptionChoiceCallable, CommandOptionValue } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export type IntegerOption = IntegerOptionWithChoices | IntegerOptionWithMinMax | IntegerOptionWithAutocomplete;

export interface IntegerOptionWithChoices extends CommandOptionValue<OptionType.INTEGER, number> {
	/** Array of Integer choices */
	choices?: CommandOptionChoiceCallable<number>;
}

export interface IntegerOptionWithMinMax extends CommandOptionValue<OptionType.INTEGER, number> {
	min?: number;
	max?: number;
}

export interface IntegerOptionWithAutocomplete extends CommandOptionValue<OptionType.INTEGER, number> {
	autocomplete?: true;
}

export class IntegerOptionResolver implements Resolver<number> {
	public option = OptionType.INTEGER;
	public convert = Constants.ApplicationCommandOptionTypes.INTEGER;

	public async resolve(ctx: AnyCommandContext, option: IntegerOption, text: string): Promise<number> {
		const value = parseInt(text, 10);
		if (Number.isNaN(value)) return null;
		if (!Number.isSafeInteger(value)) return null;

		return value;
	}
}
