import { Emoji } from 'eris';

import type { BaseContext } from '../../contexts/BaseContext';
import type { AgnosticMessageContent } from '../../interfaces/AgnosticMessageContent';
import { PossiblyTranslatable } from '../../interfaces/Translatable';

export interface PaginatorItem<T = void> {
	label: PossiblyTranslatable;
	value?: T;

	description?: PossiblyTranslatable;
	emoji?: Partial<Emoji>;

	match?: Array<string>;
}

/**
 * Returns item at requested index
 * @param index - The index
 * @returns [T, number] Tuple containing item, and count of total items
 */
export type PaginatorItemFunction<T> = (index: number) => Promise<[T, number]>;
export type PaginatorItems<T> = Array<T> | PaginatorItemFunction<T>;

export interface PaginatorOptions {
	/** How many items per page */
	itemsPerPage?: number;

	/** Index of item that should be focused on open */
	focused?: number;
}

export interface PaginatorPageItem<T> {
	item: T;

	index: number;
}

export type PaginatorPage<T> = Array<PaginatorPageItem<T>>;

export abstract class Paginator<T = unknown> {
	protected readonly ctx: BaseContext;
	protected readonly items: PaginatorItems<T>;
	protected itemCount: number;

	protected currentPage = 0;
	public readonly options: PaginatorOptions;

	protected pageCache: Map<number, Array<PaginatorPageItem<T>>> = new Map();

	public constructor(ctx: BaseContext, items: PaginatorItems<T>, options?: PaginatorOptions) {
		this.ctx = ctx;
		this.items = items;

		this.options = { itemsPerPage: 10, ...options };

		// update currentPage if focused was provided
		if (typeof this.options.focused === 'number') {
			this.page = Math.floor(options.focused / this.options.itemsPerPage) ?? 0;
		}
	}

	public get page(): number {
		if (this.currentPage > this.pageCount - 1) this.currentPage = this.pageCount - 1;
		if (this.currentPage < 0) this.currentPage = 0;

		return this.currentPage;
	}

	public set page(page: number) {
		// constrain
		if (page < 0) page = 0;
		if (page > this.pageCount - 1) page = this.pageCount - 1;

		this.currentPage = page;
	}

	public get pageCount(): number {
		let itemCount = 0;
		if (Array.isArray(this.items)) itemCount = this.items.length;
		else itemCount = this.itemCount;

		if (itemCount === 0) return 0;
		return Math.ceil(itemCount / this.options.itemsPerPage) || 1;
	}

	public get hasNext(): boolean {
		return this.page < this.pageCount - 1;
	}

	public get hasPrev(): boolean {
		return this.page > 0;
	}

	/**
	 * Get item at given index
	 * @param index Index
	 * @returns [T, number] Tuple of item, and total count of items
	 */
	public async getItem(index: number): Promise<[T, number]> {
		if (Array.isArray(this.items)) {
			const item = this.items[index];
			return [item, this.items.length];
		}

		return this.items(index);
	}

	public async getItems(page?: number, force = false): Promise<Array<PaginatorPageItem<T>>> {
		const num = page || this.page;

		// check cache
		if (this.pageCache.has(num) && !force) return this.pageCache.get(num);

		const start = num * this.options.itemsPerPage;
		const end = start + this.options.itemsPerPage;

		const items: Array<PaginatorPageItem<T>> = [];
		for (let index = start; index < end; index++) {
			const [item, count] = await this.getItem(index);
			// cache count for pageCount getter
			this.itemCount = count;

			if (!item) break;

			items.push({ item, index });
		}

		// cache page
		this.pageCache.set(num, items);

		return items;
	}

	public abstract render(): Promise<AgnosticMessageContent>;
}
