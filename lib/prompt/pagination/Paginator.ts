import { AdvancedMessageContent, InteractionContent, MessageContent } from 'eris';

import type { BaseContext } from '../../contexts/BaseContext';
import { PossiblyTranslatable } from '../../interfaces/Translatable';

export interface PaginatorItem<T> {
	label: PossiblyTranslatable;
	description?: PossiblyTranslatable;
	value?: T;
}

export interface PaginatorRender<T> {
	content: AdvancedMessageContent & InteractionContent;
	items: Array<PaginatorItem<T>>;
}

export abstract class Paginator<T = void> {
	protected readonly ctx: BaseContext;
	protected readonly items: Array<PaginatorItem<T>> = [];

	protected currentPage = 0;

	public itemsPerPage = 10;

	public constructor(ctx: BaseContext, items: Array<T | PaginatorItem<T>>) {
		this.ctx = ctx;

		// inflate Array<T> to Array<PaginatorItem<T>>
		this.items = items.map(i => {
			if (typeof i === 'object' && 'label' in i) return i;
			return { label: i.toString() };
		});
	}

	public get page(): number {
		return this.currentPage;
	}

	public set page(page: number) {
		// constrain
		if (page < 0) page = 0;
		if (page > this.pageCount - 1) page = this.pageCount - 1;

		this.currentPage = page;
	}

	public get pageCount(): number {
		return Math.ceil(this.items.length / this.itemsPerPage) || 1;
	}

	public get hasNext(): boolean {
		return this.currentPage < (this.pageCount - 1);
	}

	public get hasPrev(): boolean {
		return this.currentPage > 0;
	}

	public get isSinglePage(): boolean {
		return this.pageCount === 1;
	}

	public abstract render(): Promise<PaginatorRender<T>>;
}
