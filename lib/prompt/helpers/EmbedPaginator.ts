import { Embed } from 'eris';

import { BaseContext } from '../../contexts/BaseContext';
import { AgnosticMessageContent } from '../../interfaces/AgnosticMessageContent';

import { Paginator, PaginatorItem, PaginatorOptions } from './Paginator';

export class EmbedPaginator extends Paginator<Embed> {
	public constructor(ctx: BaseContext, embeds: Array<PaginatorItem<Embed>>, options: PaginatorOptions = {}) {
		if (!options.itemsPerPage) options.itemsPerPage = 1;
		super(ctx, embeds, options);
	}

	public async render(): Promise<AgnosticMessageContent> {
		// TODO: Make more robust and support builders in the future
		const items = await this.getPageItems();
		return { embeds: items.map(i => i.value) }; // KISS
	}
}
