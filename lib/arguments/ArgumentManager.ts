import { Component, ComponentAPI, Inject } from '@ayanaware/bento';
import { CodeblockBuilder } from '../builders';

import { CommandContext } from '../commands';
import { PromptManager, PromptRejectType } from '../prompt';
import { isPromise } from '../util';
import { ArgumentMatch, ArgumentType } from './constants';
import { Argument, Resolver, ResolverFn, ResolverResult } from './interfaces';
import { Parsed, Parser, ParserOutput, Tokenizer } from './internal';

import resolvers from './Resolvers';

interface FulfillState {
	phraseIndex: number;
}

interface ReduceItem {
	value: any;
	display: string;
	extra?: string;
	position?: number;
}

/**
 * ArgumentResolve takes in Array<Argument> and attempts to fulfill them
 */
export class ArgumentManager implements Component {
	public name = '@ayanaware/bentocord:ArgumentManager';
	public api!: ComponentAPI;

	private resolvers: Map<ArgumentType, ResolverFn<any>> = new Map();
	private transforms: Map<string, (value: any) => any> = new Map();

	@Inject() private readonly promptManager: PromptManager;

	public async onLoad() {
		return this.addResolvers(resolvers);
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

	private async execute(ctx: CommandContext, arg: Argument, phrases: Array<string>) {
		const fn = this.resolvers.get(arg.type);
		if (!fn) throw new Error(`Could not find resolver for type: ${arg.type}`);

		let result = fn.call(ctx.command, ctx, arg, phrases);
		if (isPromise(result)) result = await result;

		return result;
	}

	public async fulfill(ctx: CommandContext, args: Array<Argument>) {
		const tokens = new Tokenizer(ctx.raw).tokenize();

		// build allowedOptions
		const allowedOptions = args.filter(i => !!i.option).map(i => ({ name: i.option, phrase: i.match !== ArgumentMatch.OPTION }));
		const output = new Parser(tokens, allowedOptions).parse();

		// get rid of any empty phrases
		output.phrases = output.phrases.filter(i => i.value && i.value != '')

		const choices = {
			[ArgumentMatch.PHRASE]: this.processPhrase,
			[ArgumentMatch.FLAG]: this.processFlag,
			[ArgumentMatch.OPTION]: this.processOption,
		};

		const state: FulfillState = { phraseIndex: 0 };

		let collector: { [key: string]: any } = {};

		// option support
		const handleOptionArg = [];
		for (const option of output.options) {
			const arg = args.filter(a => !!a.option).find(a => a.option === option.key);
			if (!arg) continue;

			let phraseValues = [option.value];
			// phraseSeperators
			if (Array.isArray(arg.phraseSeperators) && arg.phraseSeperators.length > 0) {
				const regex = new RegExp(arg.phraseSeperators.join('|'), 'gi');
				phraseValues = phraseValues.join(' ').split(regex).map(v => v.trim()).filter(i => !!i);
			}

			const result = await this.resolveArgument(ctx, arg, 0, phraseValues);
			collector = {...collector, [arg.name]: result};

			handleOptionArg.push(arg.name);
		}

		let count = 0;
		for (const arg of args) {
			if (handleOptionArg.includes(arg.name)) continue;

			count++;

			const fn = choices[arg.match || ArgumentMatch.PHRASE];
			if (fn == null) throw new Error(`Unknown ArgumentMatch Type`);

			const result = await fn.call(this, ctx, state, arg, count, output);
			collector = {...collector, [arg.name]: result};
		}

		return collector;
	}

	private async processPhrase(ctx: CommandContext, state: FulfillState, arg: Argument, count: number, output: ParserOutput) {
		let phrases: Array<Parsed> = null;
		if (arg.rest) phrases = output.phrases.slice(state.phraseIndex, arg.limit || Infinity);
		else phrases = [output.phrases[state.phraseIndex]];
		phrases = phrases.filter(i => !!i);

		// consume
		state.phraseIndex += phrases.length;

		let phraseValues = phrases.length > 0 ? phrases.map(i => i.value) : [];
		// phraseSeperators
		if (Array.isArray(arg.phraseSeperators) && arg.phraseSeperators.length > 0) {
			const regex = new RegExp(arg.phraseSeperators.join('|'), 'gi');
			phraseValues = phraseValues.join(' ').split(regex).map(v => v.trim()).filter(i => !!i);
		}

		return this.resolveArgument(ctx, arg, count, phraseValues);
	}

	private async processFlag(ctx: CommandContext, state: FulfillState, arg: Argument, count: number, output: ParserOutput) {
		if (!Array.isArray(arg.flags)) return false;

		return output.flags.some(f => arg.flags.some(i => i.toLowerCase() === f.value.toLowerCase()));
	}

	private async processOption(ctx: CommandContext, state: FulfillState, arg: Argument, count: number, output: ParserOutput) {
		if (!arg.option) return null;

		const option = output.options.find(o => o.key.toLowerCase() === arg.option.toLowerCase());

		return this.resolveArgument(ctx, arg, count, [option.value]);
	}

	private async resolveArgument(ctx: CommandContext, arg: Argument, count: number, phrases: Array<string>) {
		let result;
		if (phrases.length > 0) result = await this.execute(ctx, arg, phrases);

		let values;
		if (typeof result == 'object') values = result.value;

		// failed to resolve
		if ((values == null || result.value.length < 1) && phrases.length > 0) {
			// maybe do something here later to inform user
		}

		// prompt
		if (values == null || values.length == 0 && arg.prompt) {
			// No phrases provided, and not optional, so collect
			if (phrases.length == 0 && !arg.optional) {
				result = await this.collect(ctx, arg);
				values = result.value;
			}

			// Phrase provided, failed to parse, so collect
			else if (phrases.length > 0 && (values == null || result.value.length == 0)) {
				result = await this.collect(ctx, arg);
				values = result.value;
			}
		}

		// Unwrap single element array
		if (Array.isArray(values) && values.length === 1) values = values[0];

		// "Reduce" Functionality
		if (Array.isArray(values) && values.length > 1 && result.reduce == true) {
			// limit to 10 items
			values = values.slice(0, 10);

			const items: Array<ReduceItem> = [];
			for (const value of values) {
				const display = typeof result.reduceDisplay === 'function' ? result.reduceDisplay(value) : value.toString();
				const extra = typeof result.reduceExtra === 'function' ? result.reduceExtra(value) : null;

				items.push({ value, display, extra });
			}

			values = await this.reduce(ctx, arg, items);
		}

		// default
		if (values == null && arg.default != undefined) values = arg.default;

		// not optional
		if (values == null && !arg.optional) {
			if (arg.unresolved) {
				if (typeof arg.unresolved === 'function') arg.unresolved = arg.unresolved(ctx, arg);
				throw new Error(arg.unresolved);
			}

			throw new Error(`Could not fulfill non-optional argument #${count}: "${arg.name}"`);
		}

		// call transform function
		if (typeof arg.transform === 'function') values = arg.transform.call(ctx.command, values);

		return values;
	}

	// Still not too happy with this, but better then before
	// AKA: https://www.youtube.com/watch?v=SETnK2ny1R0

	private async collect(ctx: CommandContext, arg: Argument): Promise<ResolverResult<any>> {
		const prompt = arg.prompt;
		if (!prompt.startText) return null;

		if (typeof prompt.startText === 'function') prompt.startText = prompt.startText(ctx, arg);
		if (typeof prompt.retryText === 'function') prompt.retryText = prompt.retryText(ctx, arg);

		try {
			return this.promptManager.createPrompt(ctx.channelId, ctx.authorId, prompt.startText, {
				retries: prompt.retries,
				retryText: prompt.retryText,
				validate: async (content: string) => {
					const tokens = new Tokenizer(content).tokenize();
					const output = new Parser(tokens).parse();
					const phrases = output.phrases;

					let phraseValues = phrases.length > 0 ? phrases.map(i => i.value) : [];

					// handle cancel
					if (['cancel', 'exit'].some(i => i === phraseValues[0])) {
						throw PromptRejectType.CANCEL;
					}

					// phraseSeperators
					if (Array.isArray(arg.phraseSeperators) && arg.phraseSeperators.length > 0) {
						const regex = new RegExp(arg.phraseSeperators.join('|'), 'gi');
						phraseValues = phraseValues.join(' ').split(regex).map(v => v.trim()).filter(i => !!i);
					}

					return this.execute(ctx, arg, phraseValues);
				},
			}, prompt.timeout);
		} catch (e) {
			switch (e) {
				case PromptRejectType.TIMEOUT: {
					if (typeof prompt.timeoutText === 'function') prompt.timeoutText = prompt.timeoutText(ctx, arg);
					if (prompt.timeoutText) ctx.messenger.createMessage(prompt.timeoutText);
					break;
				};

				case PromptRejectType.RETRY_LIMIT:
				case PromptRejectType.CANCEL: {
					if (typeof prompt.endedText === 'function') prompt.endedText = prompt.endedText(ctx, arg);
					if (prompt.endedText) ctx.messenger.createMessage(prompt.endedText);
					break;
				}

				default: throw e;
			}
		}
	}

	private async reduce(ctx: CommandContext, arg: Argument, items: Array<ReduceItem>) {
		for (let i = 0; i < items.length; i++) {
			items[i] = { ...items[i], position: i + 1 };
		}

		try {
			const cb = new CodeblockBuilder();
			for (const item of items) cb.addLine(item.position, item.display);

			return this.promptManager.createPrompt(ctx.channelId, ctx.authorId, await cb.render(), {
				async validate(content: string) {
					const extraMatch = items.filter(i => content === i.extra);
					if (extraMatch.length == 1) return extraMatch[0].value;

					const positions = items.filter(i => content === i.position.toString());
					if (positions.length == 1) return positions[0].value;

					const displays = items.filter(i => i.display.toLowerCase().includes(content.toLowerCase()));
					if (displays.length == 1) return displays[0].value;

					return null;
				},
			});
		} catch (e) {
			switch (e) {
				case PromptRejectType.TIMEOUT:
				case PromptRejectType.RETRY_LIMIT:
				case PromptRejectType.CANCEL: {
					break;
				}

				default: throw e;
			}
		}
	}
}
