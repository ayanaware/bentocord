import { Component, ComponentAPI } from '@ayanaware/bento';
import { CommandContext } from '../commands';
import { ArgumentMatch, ArgumentType } from './constants';
import { Argument } from './interfaces';

import { Parser, ParserOutput, Tokenizer, Parsed } from './internal';

interface FulfillState {
	phraseIndex: number;
}

/**
 * ArgumentManager takes in Array<Argument> and attempts to fulfill them
 */
export class ArgumentResolver implements Component {
	public name = 'ArgumentResolver';
	public api!: ComponentAPI;

	public async fulfill(ctx: CommandContext, args: Array<Argument>) {
		const tokens = new Tokenizer(ctx.raw).tokenize();
		const parsed = new Parser(tokens).parse();

		const choices = {
			[ArgumentMatch.PHRASE]: this.processPhrase,
			[ArgumentMatch.FLAG]: this.processFlag,
			[ArgumentMatch.REST]: this.processRest,
		};

		const state: FulfillState = { phraseIndex: 0 };

		let collector = {};
		for (const arg of args) {
			const fn = choices[arg.match || ArgumentMatch.PHRASE];
			if (fn == null) throw new Error(`Unknown ArgumentMatch Type`);

			const result = await fn.call(this, ctx, state, arg, parsed);
			collector = {...collector, [arg.name]: result};
		}

		return collector;
	}

	private isPromise(fn: any) {
		return fn && typeof fn.then == 'function' && typeof fn.catch == 'function';
	}

	private async processArgument(ctx: CommandContext, arg: Argument, value: string) {
		if (value == null) return null;

		const choices = {
			[ArgumentType.STRING]: (ctx: CommandContext, value: string) => value.toString(),
			[ArgumentType.NUMBER]: (ctx: CommandContext, value: string) => parseInt(value),
		};

		const fn = (choices as any)[arg.type];

		let result = fn.call(this, ctx, value);
		if (this.isPromise(result)) result = await result;

		if (result == null) result = arg.default;

		return result;
	}

	private async processPhrase(ctx: CommandContext, state: FulfillState, arg: Argument, result: ParserOutput) {
		const parsed = result.phrases[state.phraseIndex];
		if (!parsed) return null;

		state.phraseIndex++;

		return this.processArgument(ctx, arg, parsed.value);
	}

	private async processRest(ctx: CommandContext, state: FulfillState, arg: Argument, result: ParserOutput) {
		const rest = result.phrases.slice(state.phraseIndex)
		if (rest.length < 1) return null;

		state.phraseIndex += rest.length;

		return this.processArgument(ctx, arg, rest.map(i => i.value).join(' '));
	}

	private async processFlag(ctx: CommandContext, state: FulfillState, arg: Argument, result: ParserOutput) {

	}
}
