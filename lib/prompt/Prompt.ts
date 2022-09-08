import { Constants, Message } from 'eris';

import { NON_ERROR_HALT } from '../commands/constants/CommandManager';
import { ComponentOperation } from '../components/ComponentOperation';
import { AnyComponentContext } from '../components/contexts/AnyComponentContext';
import type { AnyContext } from '../contexts/AnyContext';
import { DiscordPermission } from '../discord/constants/DiscordPermission';
import type { PossiblyTranslatable, Translatable } from '../interfaces/Translatable';

import type { PromptManager } from './PromptManager';

const { MessageFlags } = Constants;

export type PromptValidator<T = unknown> = (response: string) => Promise<[boolean, T]>;

export const TEXT_CLOSE = ['exit', 'x', 'close', 'c', ':q'];

export class Prompt<T = unknown> extends ComponentOperation<T> {
	protected readonly pm: PromptManager;
	protected validator: PromptValidator<T>;
	protected hasHandler = false;

	protected selfMessages: Array<Message> = [];
	protected attempts = 0;

	// disable super.close() from calling super.resolve
	protected resolveOnClose = false;

	public constructor(ctx: AnyContext, validator?: PromptValidator<T>) {
		super(ctx);
		// using entity name to prevent circular depends
		this.pm = ctx.api.getEntity('@ayanaware/bentocord:PromptManager');

		if (validator) this.validator = validator;
	}

	public async render(): Promise<void> {
		// add handler if need be
		if (!this.hasHandler) {
			await this.pm.addPrompt(this.ctx.channelId, this.ctx.userId, this.handleResponse.bind(this), this.close.bind(this));
			this.hasHandler = true;
		}

		return super.render();
	}

	protected async handleInteraction(ctx: AnyComponentContext): Promise<void> {
		// constrain interaction to prompt owner
		if (ctx.userId !== this.ctx.userId) {
			await ctx.createResponse({
				content: 'This component does not belong to you',
				flags: MessageFlags.EPHEMERAL,
			});
			return;
		}

		return super.handleInteraction(ctx);
	}

	public async handleResponse(response: string, message?: Message): Promise<void> {
		// delete message if we have one and can
		const hasManage = this.ctx.selfHasPermission(DiscordPermission.MANAGE_MESSAGES);
		if (message && hasManage) {
			try {
				await message.delete();
			} catch { /* NO-OP */}
		}

		const close = TEXT_CLOSE.some(c => c.toLocaleLowerCase() === response.toLocaleLowerCase());
		if (close) {
			// User requested close
			await this.close();
			this.reject(NON_ERROR_HALT);

			return;
		}

		// no validator, just resolve
		if (typeof this.validator !== 'function') {
			await this.close();
			return this.resolve();
		}

		try {
			const [result, value] = await this.validator(response) ?? [];
			// a non-boolean result means we just fully ignore the message, no refresh, no resolve, no error
			if (typeof result !== 'boolean') return;

			// passed validator, resolve
			if (result) {
				await this.close();
				return this.resolve(value);
			}

			// failed validator, display error and refresh timeout
			this.refreshTimeout();

			// max attempts
			if (++this.attempts >= 3) {
				await this.close({ key: 'BENTOCORD_PROMPT_CANCELED_MAX_ATTEMPTS', backup: 'Max invalid attempts reached.' });
				return this.reject(NON_ERROR_HALT);
			}

			const content = await this.ctx.formatTranslation('BENTOCORD_PROMPT_VALIDATE_ERROR', {}, 'Failed to validate input. Please try again');
			const errorMessage = await this.ctx.createMessage({ content });

			// auto-delete errorMessage
			setTimeout(() => {
				errorMessage.delete().catch(e => { /* NO-OP */ });
			}, 3 * 1000);
		} catch (e: unknown) {
			await this.close(e.toString());
			this.reject(e);
		}
	}

	protected async handleTimeout(): Promise<void> {
		await this.close({ key: 'BENTOCORD_PROMPT_CANCELED_TIMEOUT', backup: 'You took too much time to respond.' });
		this.reject(new Error('Timeout'));
	}

	public async start(): Promise<T> {
		return super.start();
	}

	public async close(reason?: PossiblyTranslatable): Promise<void> {
		// detach handler
		if (this.hasHandler) await this.pm.removePrompt(this.ctx.channelId, this.ctx.userId);

		// Replace content with close message
		if (reason) {
			if (typeof reason === 'object') reason = await this.ctx.formatTranslation(reason);
			this.content(reason);
		}

		// Remove components
		this.clearRows();

		// cleanup components, final render, timeouts, etc
		await super.close();

		// clean up selfMessages
		if (this.selfMessages.length > 0) {
			const client = this.ctx.discord.client;
			if (this.ctx.selfHasPermission(DiscordPermission.MANAGE_MESSAGES)) {
				const messageIds = this.selfMessages.map(m => m.id);
				await client.deleteMessages(this.ctx.channelId, messageIds);
			} else {
				// No manage message, attempt to delete one by one
				for (const message of this.selfMessages) {
					try {
						await message.delete();
					} catch { /* NO-OP */}
				}
			}

			this.selfMessages = [];
		}
	}
}
