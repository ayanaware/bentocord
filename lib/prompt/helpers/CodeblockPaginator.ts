import { AdvancedMessageContent, InteractionContent } from 'eris';

import { LocalizedCodeblockBuilder } from '../../builders/LocalizedCodeblockBuilder';
import type { BaseContext } from '../../contexts/BaseContext';
import type { AgnosticMessageContent } from '../../interfaces/AgnosticMessageContent';
import { PossiblyTranslatable } from '../../interfaces/Translatable';

import { Paginator, PaginatorItems } from './Paginator';

export interface CodeblockPaginatorOptions {
	language?: string;

	focused?: number;

	flare?: {
		above?: PossiblyTranslatable,
		below?: PossiblyTranslatable,
		padStart?: number,
	};
}

export class CodeblockPaginator<T = void> extends Paginator<T> {
	public readonly options: CodeblockPaginatorOptions;

	public constructor(ctx: BaseContext, items: Array<PaginatorItems<T>>, options: CodeblockPaginatorOptions = {}) {
		super(ctx, items);
		this.options = options;

		if (typeof options.focused === 'number') {
			this.currentPage = Math.floor(options.focused / this.itemsPerPage) ?? 0;
		}
	}

	public async render(): Promise<AgnosticMessageContent> {
		const cbb = new LocalizedCodeblockBuilder(this.ctx, this.options.language);

		// show page header if more then 1 page
		if (!this.isSinglePage) {
			await cbb.setTranslatedHeader('BENTOCORD_PAGINATION_PAGE',
				{ page: this.page + 1, total: this.pageCount }, '[Page {page}/{total}]');
		}

		for (const item of await this.getPageItems()) {
			const flare = this.options.flare ?? {};
			const focused = item.index === this.options.focused;

			// handle above flare
			let above = flare.above;
			if (focused && above) {
				if (typeof above === 'object') above = await this.ctx.formatTranslation(above);
				if (flare.padStart > 0) above = above.padStart(flare.padStart);

				cbb.addLine(above);
			}

			// translate label if needed
			if (typeof item.label === 'object') item.label = await this.ctx.formatTranslation(item.label);

			// translate description if needed
			if (typeof item.description === 'object') item.description = await this.ctx.formatTranslation(item.description);

			// build display
			let display = item.label;
			if (item.description) display = `${display} - ${item.description}`;

			// add item
			cbb.addLine((item.index + 1).toString(), display);

			// handle below flare
			let below = flare.below;
			if (focused && below) {
				if (typeof below === 'object') below = await this.ctx.formatTranslation(below);
				if (flare.padStart > 0) below = below.padStart(flare.padStart);

				cbb.addLine(below);
			}
		}

		// return agnostic message content
		return { content: cbb.render() };
	}
}
