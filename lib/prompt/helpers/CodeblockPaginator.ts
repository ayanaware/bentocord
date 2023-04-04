import { Emoji } from 'eris';

import { LocalizedCodeblockBuilder } from '../../builders/LocalizedCodeblockBuilder';
import type { BaseContext } from '../../contexts/BaseContext';
import type { AgnosticMessageContent } from '../../interfaces/AgnosticMessageContent';
import { PossiblyTranslatable } from '../../interfaces/Translatable';

import { Paginator, PaginatorItem, PaginatorItems, PaginatorOptions } from './Paginator';

export type CodeblockPaginatorItem<T = void> = PaginatorItem<T>;
export type CodeblockPaginatorItems<T> = PaginatorItems<CodeblockPaginatorItem<T>>;

export interface CodeblockPaginatorOptions extends PaginatorOptions {
	/** Codeblock syntax highlighting language to use */
	language?: string;

	/** Works in tandem with the focused option */
	flare?: {
		above?: PossiblyTranslatable,
		below?: PossiblyTranslatable,
		padStart?: number,
	};
}
export class CodeblockPaginator<T = void> extends Paginator<CodeblockPaginatorItem<T>> {
	public readonly options: CodeblockPaginatorOptions;

	public constructor(ctx: BaseContext, items: CodeblockPaginatorItems<T>, options: CodeblockPaginatorOptions = {}) {
		super(ctx, items, options);
	}

	public async render(): Promise<AgnosticMessageContent> {
		if (this.pageCount === 0) return { content: '' };

		const cbb = new LocalizedCodeblockBuilder(this.ctx, this.options.language);
		// show page header if more then 1 page
		if (this.pageCount > 1) {
			await cbb.setTranslatedHeader('BENTOCORD_PAGINATION_PAGE',
				{ page: this.page + 1, total: this.pageCount }, '[Page {page}/{total}]');
		}

		const items = await this.getItems(null, true);
		for (const { item, index } of items) {
			const flare = this.options.flare ?? {};
			const focused = index === this.options.focused;

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
			cbb.addLine((index + 1).toString(), display);

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
