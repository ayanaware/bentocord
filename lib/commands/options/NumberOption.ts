import { Constants } from 'eris';

import { AnyCommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import type { CommandOptionChoiceCallable, CommandOptionValue } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export type NumberOption = NumberOptionWithChoices | NumberOptionWithMinMax | NumberOptionWithAutocomplete;

export interface NumberOptionWithChoices extends CommandOptionValue<OptionType.NUMBER, number> {
	/** Array of Number choices */
	choices?: CommandOptionChoiceCallable<number>;
}

export interface NumberOptionWithMinMax extends CommandOptionValue<OptionType.NUMBER, number> {
	min?: number;
	max?: number;
}

export interface NumberOptionWithAutocomplete extends CommandOptionValue<OptionType.NUMBER, number> {
	autocomplete?: true;
}

export class NumberOptionResolver implements Resolver<number> {
	public option = OptionType.NUMBER;
	public convert = Constants.ApplicationCommandOptionTypes.NUMBER;

	public async resolve(ctx: AnyCommandContext, option: NumberOption, text: string): Promise<number> {
		const value = parseInt(text, 10);
		if (Number.isNaN(value)) return null;

		return value;
	}

	public async help(ctx: AnyCommandContext, option: NumberOption, data: Map<string, string>): Promise<Map<string, string>> {
		if ('min' in option) data.set(await ctx.formatTranslation('BENTOCORD_WORD_MIN', {}, 'Min'), option.min.toString());
		if ('max' in option) data.set(await ctx.formatTranslation('BENTOCORD_WORD_MAX', {}, 'Max'), option.max.toString());

		return data;
	}
}
