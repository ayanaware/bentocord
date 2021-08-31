import { OptionType } from './constants/OptionType';
import { CommandOptionChoice } from './interfaces/CommandOption';
import { OptionResolverFn, OptionResolver } from './interfaces/OptionResolver';

const resolvers: Array<OptionResolver<unknown>> = [];
const add = (type: OptionType, fn: OptionResolverFn<unknown>) => resolvers.push({ type, fn });

// BOOLEAN
add(OptionType.BOOLEAN, async (ctx, option, input): Promise<boolean> => {
	const findTrue = /^(true|yes|y|1)$/i.exec(input.toString());
	if (findTrue) return true;

	const findFalse = /^(false|no|n|0)$/i.exec(input.toString());
	if (findFalse) return false;

	return null;
});

// NUMBER
add(OptionType.NUMBER, async (ctx, option, phrases): Promise<number> => {
	const phrase = phrases.join(' ');
	let value = null;

	const choices = option.choices;
	if (Array.isArray(choices) && choices.length > 0) {
		for (const choice of choices) {
			if (typeof choice.value !== 'number') continue;

			if (phrase.toLowerCase() === choice.name.toLowerCase()) value = choice.value;
			else if (phrase.toLowerCase() === choice.value.toString().toLowerCase()) value = choice.value;
		}
	} else {
		value = parseInt(phrase, 10);
	}

	// verify number
	if (Number.isNaN(value)) return null;

	return value;
});

add(OptionType.STRING, async (ctx, option, phrases): Promise<string> => {
	const phrase = phrases.join(' ');
	let value = null;

	const choices = option.choices;
	if (Array.isArray(choices) && choices.length > 0) {
		for (const choice of choices) {
			if (typeof choice.value !== 'string') continue;

			if (phrase.toLowerCase() === choice.name.toLowerCase()) value = choice.value;
			else if (phrase.toLowerCase() === choice.value.toString().toLowerCase()) value = choice.value;
		}
	} else {
		value = phrase;
	}

	return value;
});

export default resolvers;
