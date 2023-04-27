import { Embed } from 'eris';

import { BaseContext } from '../../contexts/BaseContext';
import { AgnosticMessageContent } from '../../interfaces/AgnosticMessageContent';

import { Paginator, PaginatorItem, PaginatorItems, PaginatorOptions } from './Paginator';

export interface EmbedPaginatorItem<T = unknown> extends PaginatorItem<T> {
	embed: Embed;
}
export type EmbedPaginatorItems<T = unknown> = PaginatorItems<EmbedPaginatorItem<T>>;

export class EmbedPaginator<T = void> extends Paginator<EmbedPaginatorItem<T>> {
	public constructor(ctx: BaseContext, items: EmbedPaginatorItems<T>, options: PaginatorOptions = {}) {
		if (!options.itemsPerPage) options.itemsPerPage = 1;
		super(ctx, items, options);
	}

	public async render(): Promise<AgnosticMessageContent> {
		const items = await this.getItems(null, true);
		if (this.pageCount === 0) return { embeds: [] };

		return { embeds: items.map(i => i.item.embed) };
	}
}
