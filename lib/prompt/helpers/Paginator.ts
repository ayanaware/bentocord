import type { BaseContext } from '../../contexts/BaseContext';
import type { AgnosticMessageContent } from '../../interfaces/AgnosticMessageContent';
import { PossiblyTranslatable } from '../../interfaces/Translatable';

export interface PaginatorItem<T> {
	label: PossiblyTranslatable;
	description?: PossiblyTranslatable;

	value?: T;
}

export interface PaginatorPageItem<T> extends PaginatorItem<T> {
	label: string;
	description?: string;

	index: number;
}

export interface PaginatorOptions {
	itemsPerPage?: number;
}

export type PaginatorItems<T> = PaginatorItem<T> | PossiblyTranslatable | number;
export abstract class Paginator<T = void> {
	protected readonly ctx: BaseContext;
	protected readonly items: Array<PaginatorItem<T>> = [];

	protected currentPage = 0;
	public readonly options: PaginatorOptions;

	public constructor(ctx: BaseContext, items: Array<PaginatorItems<T>>, options?: PaginatorOptions) {
		this.ctx = ctx;
		this.options = { itemsPerPage: 10, ...options };

		// inflate Array<T> to Array<PaginatorItem<T>>
		this.items = items.map(i => {
			// handle PaginatorItem
			if (typeof i === 'object' && 'label' in i) return i;
			// handle PossiblyTranslatable
			if (typeof i === 'object' && 'key' in i) return { label: i };
			// handle numer
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
		return Math.ceil(this.items.length / this.options.itemsPerPage) || 1;
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

	public async getPageItems(): Promise<Array<PaginatorPageItem<T>>> {
		const start = this.page * this.options.itemsPerPage;
		const end = start + this.options.itemsPerPage;

		const items: Array<PaginatorPageItem<T>> = [];
		for (let index = start; index < end; index++) {
			const item = this.items[index];
			if (!item) break;

			let label = item.label;
			if (typeof label === 'object') label = await this.ctx.formatTranslation(label);

			let description = item.description;
			if (typeof description === 'object') description = await this.ctx.formatTranslation(description);

			items.push({ ...item, index, label, description });
		}

		return items;
	}

	public abstract render(): Promise<AgnosticMessageContent>;
}
