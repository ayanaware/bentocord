import { Component, ComponentAPI, Subscribe } from '@ayanaware/bento';
import { Console } from 'console';
import { Message } from 'eris';

import { CommandContext } from '../commands';
import { Discord, DiscordEvent } from '../discord';
import { ArgumentMatch, ArgumentType } from './constants';
import { Argument, PromptOptions, Resolver, ResolverFn } from './interfaces';

import { Parsed, Parser, ParserOutput, Tokenizer } from './internal';

import resolvers from './Resolvers';

interface FulfillState {
	phraseIndex: number;
}

interface PendingPrompt {
	ctx: CommandContext;
	arg: Argument;
	channelId: string;
	userId: string;
	options: PromptOptions;
	retryCount: number;
	collector: Array<any>;
	resolve: (value?: any) => void;
	reject: (reason?: any) => void;
	refreshTimeout: (pending: PendingPrompt) => void;
	lastMessageId: string;
	timeout?: NodeJS.Timeout;
}

/**
 * ArgumentResolve takes in Array<Argument> and attempts to fulfill them
 */
export class ArgumentResolver implements Component {
	public name = 'ArgumentResolver';
	public api!: ComponentAPI;

	private resolvers: Map<ArgumentType, ResolverFn<any>> = new Map();
	private transforms: Map<string, (value: any) => any> = new Map();

	private prompts: Map<string, PendingPrompt> = new Map();

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

	private async execute(type: ArgumentType, ctx: CommandContext, phrases: Array<string>) {
		const fn = this.resolvers.get(type);
		if (!fn) throw new Error(`Could not find resolver for type: ${type}`);

		let result = fn.call(this, ctx, phrases);
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
		let phrases: Array<Parsed> = null;
		if (arg.rest) phrases = result.phrases.slice(state.phraseIndex, arg.limit || Infinity);
		else phrases = [result.phrases[state.phraseIndex]];
		phrases = phrases.filter(i => i!!);

		// consume
		state.phraseIndex += phrases.length;

		let phraseValues = phrases.length > 0 ? phrases.map(i => i.value) : [];
		// phraseSeperators
		if (Array.isArray(arg.phraseSeperators) && arg.phraseSeperators.length > 0) {
			const regex = new RegExp(arg.phraseSeperators.join('|'), 'gi');
			phraseValues = phraseValues.join(' ').split(regex).map(v => v.trim());
		}

		return this.resolveArgument(ctx, arg, phraseValues);
	}

	private async processFlag(ctx: CommandContext, state: FulfillState, arg: Argument, result: ParserOutput) {
		if (!Array.isArray(arg.flags)) return false;

		return result.flags.some(f => arg.flags.some(i => i.toLowerCase() === f.value.toLowerCase()));
	}

	private async processOption(ctx: CommandContext, state: FulfillState, arg: Argument, result: ParserOutput) {
		if (!arg.option) return null;

		const option = result.options.find(o => o.key.toLowerCase() === arg.option.toLowerCase());

		return this.resolveArgument(ctx, arg, [option.value]);
	}

	private async resolveArgument(ctx: CommandContext, arg: Argument, phrases: Array<string>) {
		let result = await this.execute(arg.type, ctx, phrases);

		// prompt
		if ((!result || result.length < 1) && !arg.optional && arg.prompt?.startText) result = await this.collect(ctx, arg);

		// default
		if (!result && arg.default) result = arg.default;

		// call transform function
		if (typeof arg.transform === 'function') result = arg.transform.call(arg.transformContext ? arg.transformContext : this, result);

		return result;
	}

	// Below is a FAST and crude Prompting System. Will be replaced in the future.
	// AKA: https://www.youtube.com/watch?v=SETnK2ny1R0

	private async collect(ctx: CommandContext, arg: Argument) {
		const options = arg.prompt;
		if (!options.startText) return null;

		// create initial message
		if (typeof options.startText === 'function') options.startText = options.startText(ctx);
		const message = await ctx.messenger.createMessage(options.startText);

		return new Promise((resolve, reject) => {
			const key = `${ctx.message.channel.id}.${ctx.message.author.id}`;
			console.log(key);
			const refreshTimeout = (pending: PendingPrompt) => {
				if (pending.timeout) clearTimeout(pending.timeout);
				pending.timeout = setTimeout(async () => {
					this.prompts.delete(key);
					if (typeof options.timeoutText === 'function') options.timeoutText = options.timeoutText(ctx);
					const message = await ctx.messenger.createMessage(options.timeoutText || 'Prompt Timeout');
					return resolve(null);
				}, options.timeout || 10 * 1000);
			};

			const pending: PendingPrompt = {
				ctx,
				arg,
				channelId: ctx.channelId,
				userId: ctx.authorId,
				options,
				retryCount: 0,
				collector: [],
				resolve, reject,
				refreshTimeout,
				lastMessageId: message.id,
			};
			pending.refreshTimeout(pending);

			this.prompts.set(key, pending);
		});
	}

	@Subscribe(Discord, DiscordEvent.MESSAGE_CREATE)
	private async handleCreateMessage(message: Message) {
		const key = `${message.channel.id}.${message.author.id}`;
		const pending = this.prompts.get(key);

		if (!pending) return;
		// prevent self consumption
		if (pending.ctx.message.id === message.id) return;

		const ctx = pending.ctx;
		const arg = pending.arg;
		const options = pending.options;

		// first delete old message
		if (pending.lastMessageId) {
			try {
				await ctx.discord.client.deleteMessage(pending.channelId, pending.lastMessageId);
			} catch (e) {
				// Failed to delete last message
			}
		}

		// slap through tokenizer and parser
		const tokens = new Tokenizer(message.content).tokenize();
		const output = new Parser(tokens).parse();

		// Escape prompt
		if (output.phrases.some(p => ['stop', 'cancel', 'exit'].some(i => p.value.includes(i)))) {
			this.prompts.delete(key);
			if (pending.timeout) clearTimeout(pending.timeout);

			if (typeof options.endedText === 'function') options.endedText = options.endedText(ctx);
			await ctx.messenger.createMessage(options.endedText || 'Prompt Ended');

			return pending.reject(new Error('Canceled per user request'));
		}

		let result = await this.execute(arg.type, ctx, output.phrases.map(i => i.value));
		if (!result || result.length < 1) {
			if (pending.retryCount++ > (options.retries || 3)) {
				// too many attempts
				this.prompts.delete(key);
				if (pending.timeout) clearTimeout(pending.timeout);

				if (typeof options.endedText === 'function') options.endedText = options.endedText(ctx);
				await ctx.messenger.createMessage(options.endedText || 'Prompt Ended');

				return pending.reject(new Error('Too many attempts'));
			}

			if (typeof options.retryText === 'function') options.retryText = options.retryText(ctx);
			const message = await ctx.messenger.createMessage(options.retryText || 'Failed to resolve. Please retry your input:');
			pending.lastMessageId = message.id;
			pending.retryCount++;

			return;
		}

		// success!!
		this.prompts.delete(key);
		if (pending.timeout) clearTimeout(pending.timeout);

		return pending.resolve(result);
	}
}
