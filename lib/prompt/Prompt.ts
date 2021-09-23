import { Logger } from '@ayanaware/logger-api';

import { Emoji } from 'eris';

import type { CommandContext } from '../commands/CommandContext';
import { Translateable } from '../interfaces/Translateable';

export interface PromptChoice<T> {
	name: string;
	value: T;

	match?: Array<string>;
}

const log = Logger.get();
export class Prompt {
	public readonly ctx: CommandContext;
	public readonly channelId: string;
	public readonly userId: string;

	public pending = false;
	public content: string;

	protected resolve: (value?: any | PromiseLike<any>) => void;
	protected reject: (reason?: any) => void;
	protected timer: NodeJS.Timeout;

	public constructor(ctx: CommandContext) {
		this.ctx = ctx;

		this.channelId = ctx.channelId;
		this.userId = ctx.authorId;
	}

	protected refresh(): void {
		if (this.timer) clearTimeout(this.timer);

		this.timer = setTimeout(() => {
			this.timeout().catch((e: unknown) => {
				log.warn(`timeout() Failure: ${e.toString()}`);
			});
		}, 30 * 1000);
	}

	protected async timeout(): Promise<void> {
		const reason = await this.ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED_TIMEOUT') || 'You took too much time to respond.';
		return this.close(reason);
	}

	protected async start<T = void>(): Promise<T> {
		return new Promise((resolve, reject) => {
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

	public async open(content: string | Translateable): Promise<any> {
		if (this.pending) await this.close(await this.ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED_NEW') || 'New prompt was opened.');

		if (typeof content === 'object') content = await this.ctx.formatTranslation(content.key, content.repl);

		const usage = await this.ctx.formatTranslation('BENTOCORD_PROMPT_USAGE') || '*You may respond via message or the `r` command.*';
		content += `\n${usage}`;

		await this.ctx.createResponse({ content });
		this.content = content;

		return this.start();
	}

	public async close(reason?: string): Promise<void> {
		let content;
		if (reason) content = await this.ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED_REASON', { reason }) || `Prompt has been closed: ${reason}`;
		else content = await this.ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED') || 'Prompt has been closed.';

		this.reject(reason);

		await this.ctx.createResponse({ content });
	}

	public async handleResponse(input: string): Promise<void> {
		return this.resolve(input);
	}

	public async handleReaction(emoji: Emoji): Promise<void> {
		return;
	}
}
