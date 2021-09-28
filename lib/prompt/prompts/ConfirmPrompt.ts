import { Message } from 'eris';

import { Translateable } from '../../interfaces/Translateable';
import { PROMPT_CLOSE } from '../Prompt';

import { PaginationPrompt } from './PaginationPrompt';

export class ConfirmPrompt extends PaginationPrompt<boolean> {
	protected async timeout(): Promise<void> {
		this.removeReactions().catch(() => { /* no-op */ });

		const reason = await this.ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED_TIMEOUT') || 'You took too much time to respond.';
		return this.close(reason);
	}

	public async open(content: string | Translateable): Promise<boolean> {
		if (typeof content === 'object') content = await this.ctx.formatTranslation(content.key, content.repl) || content.backup;
		this.content = content;

		await this.render();

		// not a single page add reactions & start prompt
		if (!this.isSinglePage) {
			this.addReactions().catch(() => { /* no-op */ });
		}

		return this.start();
	}

	public async handleResponse(input: string, message?: Message): Promise<void> {
		const close = PROMPT_CLOSE.some(c => c.toLocaleLowerCase() === input.toLocaleLowerCase());
		if (close) {
			this.deleteMessage(message).catch(() => { /* no-op */ });

			return this.close();
		}

		if (/^(true|t|yes|y|1)$/i.exec(input)) {
			Promise.all([this.removeReactions(), this.deleteMessage(message)]).catch(() => { /* no-op */ });
			return this.resolve(true);
		} else if (/^(false|f|no|n|0)$/i.exec(input)) {
			Promise.all([this.removeReactions(), this.deleteMessage(message)]).catch(() => { /* no-op */ });
			return this.resolve(false);
		}

		// nothing matched hand off to super
		return super.handleResponse(input, message);
	}
}
