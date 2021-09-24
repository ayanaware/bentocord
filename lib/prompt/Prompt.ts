import { Logger } from '@ayanaware/logger-api';

import { Emoji, Message } from 'eris';

import type { CommandContext } from '../commands/CommandContext';
import { DiscordPermission } from '../discord/constants/DiscordPermission';
import { Translateable } from '../interfaces/Translateable';

export type PromptValidate<T> = (input: string) => Promise<T>;

export const PROMPT_CLOSE = ['exit', 'x', 'close', 'c', ':q'];

const log = Logger.get();
export class Prompt<T = string> {
	public readonly ctx: CommandContext;
	public readonly channelId: string;
	public readonly userId: string;

	public pending = false;
	public sent: string;

	protected resolve: (value?: T | PromiseLike<T>) => void;
	protected reject: (reason?: any) => void;
	protected timer: NodeJS.Timeout;

	protected validate: PromptValidate<T>;
	protected attempt = 0;

	public constructor(ctx: CommandContext, validate?: PromptValidate<T>) {
		this.ctx = ctx;

		this.channelId = ctx.channelId;
		this.userId = ctx.authorId;

		this.validate = validate;
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

	protected async deleteMessage(message?: Message): Promise<void> {
		// verify we have permission first
		if (!this.ctx.selfHasPermission(DiscordPermission.MANAGE_MESSAGES)) return;

		try {
			if (message) await message.delete();
		} catch { /* Failed */ }
	}

	protected async deleteReaction(emoji: Emoji): Promise<void> {
		// verify we have permission first
		if (!this.ctx.selfHasPermission(DiscordPermission.MANAGE_MESSAGES)) return;

		try {
			await this.ctx.channel.removeMessageReaction(this.ctx.responseId, emoji.name, this.userId);
		} catch { /* Failed */ }
	}

	protected async start(): Promise<T> {
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

	public async open(content: string | Translateable): Promise<T> {
		if (this.pending) await this.close(await this.ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED_NEW') || 'New prompt was opened.');

		if (typeof content === 'object') content = await this.ctx.formatTranslation(content.key, content.repl) || content.backup;

		const usage = await this.ctx.formatTranslation('BENTOCORD_PROMPT_USAGE') || '*You may respond via message or the `r` command.*';
		content += `\n${usage}`;

		await this.ctx.createResponse({ content });
		this.sent = content;

		return this.start();
	}

	public async close(reason?: string | Translateable): Promise<void> {
		let content;
		if (reason) {
			if (typeof reason === 'object') reason = await this.ctx.formatTranslation(reason.key, reason.repl) || reason.backup;

			content = await this.ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED_REASON', { reason }) || `Prompt has been closed: ${reason}`;
		} else {
			content = await this.ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED') || 'Prompt has been closed.';
		}

		if (this.reject) this.reject(reason);

		try {
			await this.ctx.createResponse({ content });
		} catch (e) {
			log.error(`Failed to show prompt close message: ${e}.`);
		}
	}

	public async handleResponse(input: string, message?: Message): Promise<void> {
		this.deleteMessage(message).catch(() => { /* no-op */ });

		const close = PROMPT_CLOSE.some(c => c.toLocaleLowerCase() === input.toLocaleLowerCase());
		if (close) return this.close();

		let result: T;
		if (typeof this.validate === 'function') {
			try {
				result = await this.validate(input);
			} catch (e) {
				return this.close(e.toString());
			}
		} else {
			// no validate function. lets resolve
			return this.resolve();
		}

		// new attempt, extend timeout
		this.refresh();

		// successful result
		if (typeof result != null) {
			return this.resolve(result);
		}

		if (this.attempt++ >= 3) {
			const canceled = await this.ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED_MAX_ATTEMPTS') || 'Max invalid attempts reached.';
			return this.close(canceled);
		}

		const error = await this.ctx.formatTranslation('BENTOCORD_PROMPT_VALIDATE_ERROR') || '**Failed to validate input. Please try again**';
		const content = `${this.sent}\n\n${error}`;

		await this.ctx.createResponse({ content });
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public async handleReaction(message: Message, emoji: Emoji): Promise<void> {
		return;
	}
}
