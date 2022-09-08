import { AdvancedMessageContent, InteractionContent } from 'eris';

import { LocalizedCodeblockBuilder } from '../../builders/LocalizedCodeblockBuilder';
import type { BaseContext } from '../../contexts/BaseContext';
import { PossiblyTranslatable } from '../../interfaces/Translatable';

import { Paginator, PaginatorItem, PaginatorRender } from './Paginator';

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
	protected options: CodeblockPaginatorOptions;

	public constructor(ctx: BaseContext, items: Array<T | PaginatorItem<T>>, options: CodeblockPaginatorOptions = {}) {
		super(ctx, items);
		this.options = options;
	}

	public async render(): Promise<PaginatorRender<T>> {
		const cbb = new LocalizedCodeblockBuilder(this.ctx, this.options.language);

		// show page header if more then 1 page
		if (!this.isSinglePage) {
			await cbb.setTranslatedHeader('BENTOCORD_PAGINATION_PAGE',
				{ page: this.page + 1, total: this.pageCount }, '[Page {page}/{total}]');
		}

		const start = this.page * this.itemsPerPage;
		const end = start + this.itemsPerPage;

		const items: Array<PaginatorItem<T>> = [];
		for (let i = start; i < end; i++) {
			const item = this.items[i];
			if (!item) continue;

			const flare = this.options.flare ?? {};
			const focused = i === this.options.focused;

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
			cbb.addLine((i + 1).toString(), item.label);
			items.push(item);

			// handle below flare
			let below = flare.below;
			if (focused && below) {
				if (typeof below === 'object') below = await this.ctx.formatTranslation(below);
				if (flare.padStart > 0) below = below.padStart(flare.padStart);

				cbb.addLine(below);
			}
		}

		// create content
		const content: AdvancedMessageContent & InteractionContent = {};
		content.content = cbb.render();

		return { content, items };
	}
}
