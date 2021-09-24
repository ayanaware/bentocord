import { Emoji, Message } from 'eris';

import { CodeblockBuilder } from '../../builders/CodeblockBuilder';
import type { CommandContext } from '../../commands/CommandContext';
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
	flare?: { above?: string | Translateable, below?: string | Translateable, offset?: number };
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
	public language: string;

	public itemsPerPage = 10;
	public currentPage = 0;

	private readonly options: PaginationOptions;

	protected content: string;
	private readonly items: Array<string | Translateable> = [];

	public constructor(ctx: CommandContext, items: Array<string | Translateable>, options: PaginationOptions = {}) {
		super(ctx);
		this.items = items;

		this.options = options;

		this.language = options.language;

		this.itemsPerPage = options.itemsPerPage || this.itemsPerPage;
		this.currentPage = Math.ceil(options.focused / this.itemsPerPage) - 1 || 0;
	}

	public get maxPage(): number {
		return Math.ceil(this.items.length / this.itemsPerPage);
	}

	public get isSinglePage(): boolean {
		return this.maxPage === 1;
	}

	protected async timeout(): Promise<void> {
		this.removeReactions().catch(() => { /* no-op */ });

		this.resolve();
	}

	public async open(content: string | Translateable): Promise<T> {
		if (typeof content === 'object') content = await this.ctx.formatTranslation(content.key, content.repl);
		this.content = content;

		await this.render();

		// not a single page add reactions & start prompt
		if (!this.isSinglePage) {
			this.addReactions().catch(() => { /* no-op */ });
			return this.start();
		}

		// was single page just go ahead and resolve
		this.resolve();
	}

	protected async render(): Promise<void> {
		const cbb = new CodeblockBuilder(this.language);

		// constrain
		if (this.currentPage < 0) this.currentPage = 0;
		else if (this.currentPage >= this.maxPage) this.currentPage = this.maxPage - 1;

		const header = await this.ctx.formatTranslation('BENTOCORD_PAGINATION_PAGE', { page: this.currentPage + 1, max: this.maxPage }) || `[Page ${this.currentPage + 1}/${this.maxPage}]`;
		cbb.setHeader(header);

		const start = this.currentPage * this.itemsPerPage;
		const end = (this.currentPage + 1) * this.itemsPerPage - 1;
		for (let i = start; i < end; i++) {
			let item = this.items[i];
			if (!item) continue;

			// attempt to translate
			if (typeof item === 'object') item = await this.ctx.formatTranslation(item.key, item.repl) || item.key;

			const focused = this.options.focused || null;
			// above flare
			const flare = this.options.flare || {};
			let above = flare.above;
			if (!isNaN(focused) && i === focused && above) {
				if (typeof above === 'object') above = await this.ctx.formatTranslation(above.key, above.repl) || above.key;
				if (flare.offset > 0) above = above.padStart(flare.offset);
				cbb.addLine(above);
			}

			cbb.addLine(i + 1, item);

			// below flare
			let below = flare.below;
			if (!isNaN(focused) && i === focused && below) {
				if (typeof below === 'object') below = await this.ctx.formatTranslation(below.key, below.repl) || below.key;
				if (flare.offset > 0) below = below.padStart(flare.offset);
				cbb.addLine(below);
			}
		}

		let content = cbb.render();
		if (this.content) content = `${this.content}\n${content}`;

		// is more then one page show navigation info
		if (!this.isSinglePage) {
			const usage = await this.ctx.formatTranslation('BENTOCORD_PAGINATION_NAVIGATION') || 'Type `<` or `>` to switch pages, `x` to close, or `p<number>` to jump to a page (ex. `p10`).';
			content += usage;

			// if no manage message complain :P
			if (!this.ctx.selfHasPermission(DiscordPermission.MANAGE_MESSAGES)) {
				const missing = await this.ctx.formatTranslation('BENTOCORD_PROMPT_MISSING_PERMISSION', { permission: 'MANAGE_MESSAGES' }) || 'It doesn\'t look like I have the `MANAGE_MESSAGE` Discord permission. Please grant it for a better experience.';
				content += `\n${missing}`;
			}
		}

		await this.ctx.createResponse({ content });
		this.sent = content;
	}

	protected async addReactions(): Promise<void> {
		const messageId = this.ctx.responseId;
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
		const messageId = this.ctx.responseId;
		const channel = this.ctx.channel;
		const selfId = this.ctx.discord.client.user.id;
		if (!messageId || !channel || !selfId) return;

		try {
			await Promise.all([
				channel.removeMessageReaction(messageId, PaginationControls.EMOJI_FIRST, selfId),
				channel.removeMessageReaction(messageId, PaginationControls.EMOJI_PREV, selfId),
				channel.removeMessageReaction(messageId, PaginationControls.EMOJI_NEXT, selfId),
				channel.removeMessageReaction(messageId, PaginationControls.EMOJI_LAST, selfId),
				channel.removeMessageReaction(messageId, PaginationControls.EMOJI_CLOSE, selfId),
			]);
		} catch { /* Failed */}
	}

	public async handleResponse(input: string, message?: Message): Promise<void> {
		const close = PROMPT_CLOSE.some(c => c.toLocaleLowerCase() === input.toLocaleLowerCase());
		if (close) {
			Promise.all([this.removeReactions(), this.deleteMessage(message)]).catch(() => { /* no-op */ });

			this.resolve();
			return;
		}

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
		if (message.id !== this.ctx.responseId) return;

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
				this.resolve();
				return;
			}
		}

		// Refresh timeout as they just interacted
		this.refresh();

		Promise.all([this.render(), this.deleteReaction(emoji)]).catch(() => { /* no-op */ });
	}
}
