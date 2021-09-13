import { Logger } from '@ayanaware/logger-api';

import { CodeblockBuilder } from '../builders/CodeblockBuilder';

import type { CommandContext } from './CommandContext';

export type PromptValidate<T> = (input: string) => Promise<T>;

export interface PromptChoice<T> {
	name: string;
	value: T;

	match?: Array<string>;
}

const log = Logger.get();
export class Prompt<T = string> {
	public readonly ctx: CommandContext;

	public pending = false;
	public attempt = 0;

	private content: string;
	private validate: PromptValidate<T>;
	private resolve: (value: T | PromiseLike<T>) => void;
	private reject: (reason?: any) => void;
	private timer: NodeJS.Timeout;

	public constructor(ctx: CommandContext) {
		this.ctx = ctx;
	}

	private refresh() {
		if (this.timer) clearTimeout(this.timer);

		this.timer = setTimeout(() => {
			this.timeout().catch((e: unknown) => {
				log.warn(`timeout() Failure: ${e.toString()}`);
			});
		}, 30 * 1000);
	}

	private async timeout() {
		const reason = await this.ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED_TIMEOUT') || 'You took too much time to respond.';
		return this.cancel(reason);
	}

	/** Cancel this prompt if it is open */
	public async cancel(reason?: string): Promise<void> {
		let content;
		if (reason) content = await this.ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED_REASON', { reason }) || `Prompt has been canceled: ${reason}`;
		else content = await this.ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED') || 'Prompt has been canceled.';

		this.reject(reason);

		await this.ctx.createResponse({ content });
	}

	public async prompt(content: string, validate: PromptValidate<T>): Promise<T> {
		if (this.pending) await this.cancel(await this.ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED_NEW') || 'New prompt was opened.');

		const usage = await this.ctx.formatTranslation('BENTOCORD_PROMPT_USAGE') || '*You may respond via message or the `r` command.*';
		content += `\n${usage}`;

		await this.ctx.createResponse({ content });
		this.content = content;

		return new Promise<T>((resolve, reject) => {
			this.validate = validate;

			this.resolve = async value => {
				if (this.timer) clearTimeout(this.timer);
				this.pending = false;

				resolve(value);
			};

			this.reject = async (reason?: any) => {
				if (this.timer) clearTimeout(this.timer);
				this.pending = false;

				reject(reason);
			};

			this.pending = true;
			this.refresh();
		});
	}

	public async choose(choices: Array<PromptChoice<T>>, content?: string): Promise<T> {
		if (this.pending) await this.cancel(await this.ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED_NEW') || 'New prompt was opened.');

		const cbb = new CodeblockBuilder('');

		// add number choices
		for (let i = 0; i < Math.min(choices.length, 25); i++) {
			const choice = choices[i];
			if (!Array.isArray(choice.match)) choice.match = [];

			choice.match.push((i + 1).toString());
			cbb.addLine(i + 1, choice.name);
		}

		if (!content) content = await this.ctx.formatTranslation('BENTOCORD_PROMPT_CHOICE') || 'Please select one of the following choices:';
		content += cbb.render();

		return this.prompt(content, async (input: string) => {
			for (const choice of choices) {
				if (!Array.isArray(choice.match)) continue;

				if (choice.match.some(c => c.toLowerCase() === input.toLowerCase())) return choice.value;
			}
		});
	}

	public async handleResponse(input: string): Promise<void> {
		const shouldClose = ['exit', 'cancel', 'c', ':q'].some(c => c.toLowerCase() === input.toLowerCase());
		if (shouldClose) return this.cancel();

		let result: T;
		if (typeof this.validate === 'function') {
			try {
				result = await this.validate(input);
			} catch (e) {
				return this.cancel(e.toString());
			}
		}

		// new attempt, extend timeout
		this.refresh();

		// successful result
		if (result) return this.resolve(result);

		if (this.attempt++ >= 3) {
			const canceled = await this.ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED_MAX_ATTEMPTS') || 'Max invalid attempts reached.';
			return this.cancel(canceled);
		}

		const message = await this.ctx.formatTranslation('BENTOCORD_PROMPT_VALIDATE_ERROR') || '**Failed to validate input. Please try again**';
		const content = `${this.content}\n\n${message}`;

		await this.ctx.createResponse({ content });
	}
}
