import { Embed } from 'eris';

import { BaseContext } from '../../contexts/BaseContext';
import { AgnosticMessageContent } from '../../interfaces/AgnosticMessageContent';
import { PossiblyTranslatable } from '../../interfaces/Translatable';

import { Paginator, PaginatorItem, PaginatorItems, PaginatorOptions } from './Paginator';

export interface EmbedPaginatorItem<T> extends Omit<PaginatorItem<T>, 'label'> {
	embed: Embed;
	label?: PossiblyTranslatable;
}
export type EmbedPaginatorItems<T> = PaginatorItems<EmbedPaginatorItem<T>>;

export class EmbedPaginator<T> extends Paginator<EmbedPaginatorItem<T>> {
	public constructor(ctx: BaseContext, items: EmbedPaginatorItems<T>, options: PaginatorOptions = {}) {
		if (!options.itemsPerPage) options.itemsPerPage = 1;
		super(ctx, items, options);
	}

	public async render(): Promise<AgnosticMessageContent> {
		const page = await this.getPage();

		return { embeds: page.map(i => i.item.embed) };
	}
}
