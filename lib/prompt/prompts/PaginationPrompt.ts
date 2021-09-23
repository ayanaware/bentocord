import { Emoji } from 'eris';

import { CodeblockBuilder } from '../../builders/CodeblockBuilder';
import { CommandContext } from '../../commands/CommandContext';
import { Translateable } from '../../interfaces/Translateable';
import { Prompt } from '../Prompt';

export interface PaginationOptions {
	/** How many items will be showed per page */
	itemsPerPage?: number;

	/** Ensures this item is visible at open, for example if it would be on page 2, page 2 will be shown */
	visibleItemIndex?: number;

	/** Code block language to use */
	language?: string;
}

export enum PaginationControls {
	EMOJI_NEXT = '➡',
	EMOJI_PREV = '⬅',
	EMOJI_CLOSE = '🇽',
	NEXT = '>',
	PREV = '<',
}

export class PaginationPrompt extends Prompt {
	public itemsPerPage = 10;
	public currentPage = 0;
	public language: string;

	private readonly items: Array<string | Translateable> = [];

	private header: string;

	public constructor(ctx: CommandContext, items: Array<string | Translateable>, options: PaginationOptions = {}) {
		super(ctx);

		this.items = items;

		this.itemsPerPage = options.itemsPerPage || this.itemsPerPage;
		this.currentPage = Math.ceil(options.visibleItemIndex / this.itemsPerPage) - 1 || 0;
		this.language = options.language;
	}

	public get maxPage(): number {
		return Math.ceil(this.items.length / this.itemsPerPage);
	}

	public get isSinglePage(): boolean {
		return this.maxPage === 1;
	}

	public async open(header: string | Translateable): Promise<void> {
		if (typeof header === 'object') header = await this.ctx.formatTranslation(header.key, header.repl);
		this.header = header;

		await this.render();

		// not a single page add reactions
		if (!this.isSinglePage) await this.addReactions();

		return this.start();
	}

	protected async render(): Promise<void> {
		const cbb = new CodeblockBuilder(this.language);

		// constrain
		if (this.currentPage < 0) this.currentPage = 0;
		else if (this.currentPage > this.maxPage) this.currentPage = this.maxPage;

		const header = await this.ctx.formatTranslation('BENTOCORD_PAGINATION_PAGE', { page: this.currentPage + 1, max: this.maxPage }) || `[Page ${this.currentPage + 1}/${this.maxPage}]`;
		cbb.setHeader(header);

		const start = this.currentPage * this.itemsPerPage;
		const end = (this.currentPage + 1) * this.itemsPerPage - 1;
		for (let i = start; i < end; i++) {
			let item = this.items[i];
			if (!item) continue;

			// attempt to translate
			if (typeof item === 'object') item = await this.ctx.formatTranslation(item.key, item.repl) || item.toString();

			cbb.addLine(i + 1, item);
		}

		let content = cbb.render();
		if (this.header) content = `${this.header}\n${content}`;

		await this.ctx.createResponse({ content });

		this.content = content;
	}

	protected async addReactions(): Promise<void> {
		const messageId = this.ctx.responseId;
		if (!messageId || !this.ctx.channel) return;
		const channel = this.ctx.channel;

		try {
			await Promise.all([
				channel.addMessageReaction(messageId, PaginationControls.EMOJI_NEXT),
				channel.addMessageReaction(messageId, PaginationControls.EMOJI_PREV),
				channel.addMessageReaction(messageId, PaginationControls.EMOJI_CLOSE),
			]);
		} catch { /* Failed */ }
	}

	public async handleResponse(input: string): Promise<void> {
		const close = ['exit', 'cancel', 'c', ':q'].some(c => c.toLowerCase() === input.toLowerCase());
		if (close) return this.resolve();

		switch (input) {
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

			default: {
				const matches = /^p(\d+)/.exec(input);
				if (!matches) return;

				const page = parseInt(matches[1], 10);
				if (isNaN(page)) return;

				this.currentPage = page;
			}
		}

		return this.render();
	}

	public async handleReaction(emoji: Emoji): Promise<void> {
		switch (emoji.name) {
			case PaginationControls.EMOJI_NEXT: {
				this.currentPage++;
				break;
			}

			case PaginationControls.EMOJI_PREV: {
				this.currentPage--;
				break;
			}

			case PaginationControls.EMOJI_CLOSE: {
				this.resolve();
				return;
			}
		}

		return this.render();
	}
}
