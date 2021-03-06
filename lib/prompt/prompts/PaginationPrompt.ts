import { Emoji, Message } from 'eris';

import { CodeblockBuilder } from '../../builders/CodeblockBuilder';
import type { AnyCommandContext } from '../../commands/CommandContext';
import { DiscordPermission } from '../../discord/constants/DiscordPermission';
import { Translateable } from '../../interfaces/Translateable';
import { Prompt, PROMPT_CLOSE } from '../Prompt';

export interface PaginationOptions {
	/** Code block language to use */
	language?: string;

	/** How many items will be showed per page */
	itemsPerPage?: number;

	/** Ensures this item is visible at open, for example if it would be on page 2, page 2 will be shown */
	focused?: number;

	/** Works in tandum with focused, add string above and/or below the focused index */
	flare?: { above?: string | Translateable, below?: string | Translateable, padStart?: number };

	/** When this pagination is closed should we resovle or reject */
	resolveOnClose?: boolean;
}

export enum PaginationControls {
	EMOJI_FIRST = '🇫',
	EMOJI_NEXT = '➡',
	EMOJI_PREV = '⬅',
	EMOJI_LAST = '🇱',
	EMOJI_CLOSE = '🇽',
	FIRST = 'f',
	NEXT = '>',
	PREV = '<',
	LAST = 'l',
}

export class PaginationPrompt<T = void> extends Prompt<T> {
	public itemsPerPage = 10;
	public currentPage = 0;

	private readonly options: PaginationOptions;

	protected content: string;
	private readonly items: Array<string | Translateable> = [];

	public constructor(ctx: AnyCommandContext, items?: Array<string | Translateable>, options: PaginationOptions = {}) {
		super(ctx);
		this.items = items || [];
		this.options = Object.assign({
			resolveOnClose: true,
		} as PaginationOptions, options);

		this.itemsPerPage = options.itemsPerPage || this.itemsPerPage;
		if (typeof options.focused === 'number') this.currentPage = Math.ceil(options.focused / this.itemsPerPage) - 1 || 0;
	}

	public get maxPage(): number {
		return Math.ceil(this.items.length / this.itemsPerPage) || 1;
	}

	public get isSinglePage(): boolean {
		return this.maxPage === 1;
	}

	protected async timeout(): Promise<void> {
		const reason = await this.ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED_TIMEOUT', {}, 'You took too much time to respond.');
		return this.close(reason);
	}

	public async open(content: string | Translateable): Promise<T> {
		if (typeof content === 'object') content = await this.ctx.formatTranslation(content.key, content.repl, content.backup);
		this.content = content;

		await this.render();

		// not a single page add reactions & start prompt
		if (!this.isSinglePage) {
			this.addReactions().catch(() => { /* no-op */ });
			return this.start();
		}
	}

	public async close(reason?: string | Translateable): Promise<void> {
		this.removeReactions().catch(() => { /* no-op */ });

		// re-render to remove navigation messages
		this.closing = true;
		await this.render();

		const resolveOnClose = this.options.resolveOnClose;
		if (typeof resolveOnClose === 'boolean' && resolveOnClose) return this.resolve();

		return super.close(reason);
	}

	protected async render(): Promise<void> {
		// handle zero item paginations
		if (this.items.length === 0) {
			await this.ctx.createResponse({ content: this.content });
			this.sent = this.content;
			return;
		}

		const cbb = new CodeblockBuilder(this.options.language);

		// constrain
		if (this.currentPage < 0) this.currentPage = 0;
		else if (this.currentPage >= this.maxPage) this.currentPage = this.maxPage - 1;

		// only add page header if more then 1 page
		if (!this.isSinglePage) {
			const header = await this.ctx.formatTranslation('BENTOCORD_PAGINATION_PAGE', { page: this.currentPage + 1, total: this.maxPage }, '[Page {page}/{total}]');
			cbb.setHeader(header);
		}

		const start = this.currentPage * this.itemsPerPage;
		const end = (this.currentPage + 1) * this.itemsPerPage;
		for (let i = start; i < end; i++) {
			let item = this.items[i];
			if (!item) continue;

			// attempt to translate
			if (typeof item === 'object') item = await this.ctx.formatTranslation(item.key, item.repl) || item.key;

			const focused = this.options.focused;
			// above flare
			const flare = this.options.flare || {};
			let above = flare.above;
			if (!isNaN(focused) && i === focused && above) {
				if (typeof above === 'object') above = await this.ctx.formatTranslation(above.key, above.repl) || above.key;
				if (flare.padStart > 0) above = above.padStart(flare.padStart);
				cbb.addLine(above);
			}

			cbb.addLine(i + 1, item);

			// below flare
			let below = flare.below;
			if (!isNaN(focused) && i === focused && below) {
				if (typeof below === 'object') below = await this.ctx.formatTranslation(below.key, below.repl) || below.key;
				if (flare.padStart > 0) below = below.padStart(flare.padStart);
				cbb.addLine(below);
			}
		}

		let content = cbb.render();
		if (this.content) content = `${this.content}\n${content}`;

		// is more then one page show navigation info
		if (!this.isSinglePage && !this.closing) {
			const usage = await this.ctx.formatTranslation('BENTOCORD_PAGINATION_NAVIGATION', {}, 'Type `<` or `>` to switch pages, `x` to close, or `p<number>` to jump to a page (ex. `p10`).');
			content += usage;

			// if no manage message complain :P
			if (!this.ctx.selfHasPermission(DiscordPermission.MANAGE_MESSAGES)) {
				const missing = await this.ctx.formatTranslation('BENTOCORD_PROMPT_MISSING_PERMISSION', { permission: 'MANAGE_MESSAGES' }, 'It doesn\'t look like I have the `{permission}` Discord permission. Please grant it for a better experience.');
				content += `\n${missing}`;
			}
		}

		await this.ctx.createResponse({ content });
		this.sent = content;
	}

	protected async addReactions(): Promise<void> {
		const messageId = await this.ctx.getResponseId();
		if (!messageId || !this.ctx.channel) return;
		const channel = this.ctx.channel;

		// verify we have permission first
		if (!this.ctx.selfHasPermission(DiscordPermission.ADD_REACTIONS)) return;

		try {
			await Promise.all([
				channel.addMessageReaction(messageId, PaginationControls.EMOJI_FIRST),
				channel.addMessageReaction(messageId, PaginationControls.EMOJI_PREV),
				channel.addMessageReaction(messageId, PaginationControls.EMOJI_NEXT),
				channel.addMessageReaction(messageId, PaginationControls.EMOJI_LAST),
				channel.addMessageReaction(messageId, PaginationControls.EMOJI_CLOSE),
			]);
		} catch { /* Failed */ }
	}

	protected async removeReactions(): Promise<void> {
		const messageId = await this.ctx.getResponseId();
		const channel = this.ctx.channel;
		const selfId = this.ctx.self.id;
		if (!messageId || !channel || !selfId) return;

		// if we have manage message, just yeet all the reactions
		if (this.ctx.selfHasPermission(DiscordPermission.MANAGE_MESSAGES)) {
			try {
				await this.ctx.discord.client.removeMessageReactions(channel.id, messageId);
			} catch { /* Failed */ }

			return;
		}

		// No manage message delete our reactions
		try {
			await Promise.all([
				channel.removeMessageReaction(messageId, PaginationControls.EMOJI_FIRST, selfId),
				channel.removeMessageReaction(messageId, PaginationControls.EMOJI_PREV, selfId),
				channel.removeMessageReaction(messageId, PaginationControls.EMOJI_NEXT, selfId),
				channel.removeMessageReaction(messageId, PaginationControls.EMOJI_LAST, selfId),
				channel.removeMessageReaction(messageId, PaginationControls.EMOJI_CLOSE, selfId),
			]);
		} catch { /* Failed */ }
	}

	public async handleResponse(input: string, message?: Message): Promise<void> {
		const close = PROMPT_CLOSE.some(c => c.toLocaleLowerCase() === input.toLocaleLowerCase());
		if (close) return this.close();

		switch (input) {
			case PaginationControls.EMOJI_FIRST:
			case PaginationControls.FIRST: {
				this.currentPage = 0;
				break;
			}

			case PaginationControls.EMOJI_NEXT:
			case PaginationControls.NEXT: {
				this.currentPage++;
				break;
			}

			case PaginationControls.EMOJI_PREV:
			case PaginationControls.PREV: {
				this.currentPage--;
				break;
			}

			case PaginationControls.EMOJI_LAST:
			case PaginationControls.LAST: {
				this.currentPage = this.maxPage - 1;
				break;
			}

			default: {
				const matches = /^p\s?(\d+)/.exec(input);
				if (!matches) return;

				const page = parseInt(matches[1], 10);
				if (isNaN(page)) return;
				this.currentPage = page - 1; // zero index gang :>
			}
		}

		// Refresh timeout as they just interacted
		this.refresh();

		Promise.all([this.render(), this.deleteMessage(message)]).catch(() => { /* no-op */ });
	}

	public async handleReaction(message: Message, emoji: Emoji): Promise<void> {
		if (this.isSinglePage) return;
		if (message.id !== await this.ctx.getResponseId()) return;

		switch (emoji.name) {
			case PaginationControls.EMOJI_FIRST: {
				this.currentPage = 0;
				break;
			}

			case PaginationControls.EMOJI_NEXT: {
				this.currentPage++;
				break;
			}

			case PaginationControls.EMOJI_PREV: {
				this.currentPage--;
				break;
			}

			case PaginationControls.EMOJI_LAST: {
				this.currentPage = this.maxPage - 1;
				break;
			}

			case PaginationControls.EMOJI_CLOSE: {
				return this.close();
			}
		}

		// Refresh timeout as they just interacted
		this.refresh();

		Promise.all([this.render(), this.deleteReaction(emoji)]).catch(() => { /* no-op */ });
	}
}
