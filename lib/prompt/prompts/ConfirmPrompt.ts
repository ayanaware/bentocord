import { Message } from 'eris';

import { CommandContext } from '../../commands/CommandContext';
import { Translateable } from '../../interfaces/Translateable';
import { PROMPT_CLOSE } from '../Prompt';

import { PaginationOptions, PaginationPrompt } from './PaginationPrompt';

export class ConfirmPrompt extends PaginationPrompt<boolean> {
	public constructor(ctx: CommandContext, items?: Array<string | Translateable>, options: PaginationOptions = {}) {
		options = Object.assign({
			resolveOnClose: false,
		} as PaginationOptions, options);

		super(ctx, items, options);
	}

	public async open(content: string | Translateable): Promise<boolean> {
		if (typeof content === 'object') content = await this.ctx.formatTranslation(content.key, content.repl, content.backup);
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
