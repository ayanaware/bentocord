import { Component, ComponentAPI } from '@ayanaware/bento';
import { CommandContext } from '../commands';
import { ArgumentMatch, ArgumentType } from './constants';
import { Argument, Resolver, ResolverFn } from './interfaces';

import { Parsed, Parser, ParserOutput, Tokenizer } from './internal';

import resolvers from './Resolvers';

interface FulfillState {
	phraseIndex: number;
}

/**
 * ArgumentResolve takes in Array<Argument> and attempts to fulfill them
 */
export class ArgumentResolver implements Component {
	public name = 'ArgumentResolver';
	public api!: ComponentAPI;

	private resolvers: Map<ArgumentType, ResolverFn<any>> = new Map();

	public async onLoad() {
		return this.addResolvers(resolvers);
	}

	private isPromise(fn: any) {
		return fn && typeof fn.then == 'function' && typeof fn.catch == 'function';
	}

	public addResolvers(resolvers: Array<Resolver<any>>) {
		for (const resolver of resolvers) this.addResolver(resolver.type, resolver.fn);
	}

	public addResolver(type: ArgumentType, fn: ResolverFn<any>) {
		this.resolvers.set(type, fn);
	}

	public removeResolver(type: ArgumentType) {
		this.resolvers.delete(type);
	}

	private async execute(type: ArgumentType, ctx: CommandContext, phrase: string) {
		const fn = this.resolvers.get(type);
		if (!fn) throw new Error(`Could not find resolver for type: ${type}`);

		let result = fn.call(this, ctx, phrase);
		if (this.isPromise(result)) result = await result;

		return result;
	}

	public async fulfill(ctx: CommandContext, args: Array<Argument>) {
		const tokens = new Tokenizer(ctx.raw).tokenize();

		// build allowedOptions
		const allowedOptions = args.filter(i => !!i.option).map(i => ({ name: i.option, phrase: i.match !== ArgumentMatch.OPTION }));
		const parsed = new Parser(tokens, allowedOptions).parse();

		const choices = {
			[ArgumentMatch.PHRASE]: this.processPhrase,
			[ArgumentMatch.FLAG]: this.processFlag,
			[ArgumentMatch.OPTION]: this.processOption,
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

	private async processPhrase(ctx: CommandContext, state: FulfillState, arg: Argument, result: ParserOutput) {
		let phrase: Array<Parsed> = null;
		if (arg.rest) phrase = result.phrases.slice(state.phraseIndex, arg.limit || Infinity);
		else phrase = [result.phrases[state.phraseIndex]];

		phrase = phrase.filter(i => i!!);

		if (!phrase || phrase.length < 1) return null;
		state.phraseIndex += phrase.length;

		return this.resolveArgument(ctx, arg, phrase.map(i => i.value).join(' '));
	}

	private async processFlag(ctx: CommandContext, state: FulfillState, arg: Argument, result: ParserOutput) {
		if (!Array.isArray(arg.flags)) return false;

		return result.flags.some(f => arg.flags.some(i => i.toLowerCase() === f.value.toLowerCase()));
	}

	private async processOption(ctx: CommandContext, state: FulfillState, arg: Argument, result: ParserOutput) {
		if (!arg.option) return null;

		const option = result.options.find(o => o.key.toLowerCase() === arg.option.toLowerCase());

		return this.resolveArgument(ctx, arg, option.value);
	}

	private async resolveArgument(ctx: CommandContext, arg: Argument, phrase: string) {
		if (phrase == null) return null;

		let result = await this.execute(arg.type, ctx, phrase);

		if (!result && arg.default) result = arg.default;

		if (!arg.optional) {
			// TODO: Prompting and Collecting Input!
		}

		// call transform function
		if (typeof arg.transform === 'function') result = arg.transform.call(arg.transformContext ? arg.transformContext : this, result);

		return result;
	}
}
