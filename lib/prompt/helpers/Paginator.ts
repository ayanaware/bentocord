import { Emoji } from 'eris';

import type { BaseContext } from '../../contexts/BaseContext';
import type { AgnosticMessageContent } from '../../interfaces/AgnosticMessageContent';
import { PossiblyTranslatable } from '../../interfaces/Translatable';

export interface PaginatorItem<T = unknown> {
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
export type PaginatorItemFunction<T> = () => Promise<Array<T>>;
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

	public constructor(ctx: BaseContext, items: PaginatorItems<T>, options?: PaginatorOptions) {
		this.ctx = ctx;
		this.items = items;

		this.options = { itemsPerPage: 10, ...options };

		// update currentPage if focused was provided
		if (typeof this.options.focused === 'number') {
			this.currentPage = Math.floor(options.focused / this.options.itemsPerPage) ?? 0;
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
	 * @returns PaginatorPageItem
	 */
	public async getItem(index: number): Promise<PaginatorPageItem<T>> {
		let items = this.items;
		if (typeof items === 'function') items = await items();
		this.itemCount = items.length;

		const item = items[index] ?? null;
		return { item, index };
	}

	public async getItems(page?: number): Promise<Array<PaginatorPageItem<T>>> {
		const num = page || this.currentPage;

		const start = num * this.options.itemsPerPage;
		const end = start + this.options.itemsPerPage;

		let items = this.items;
		if (typeof items === 'function') items = await items();
		this.itemCount = items.length;

		const out: Array<PaginatorPageItem<T>> = [];
		for (let index = start; index < end; index++) {
			const item = items[index] ?? null;
			if (!item) break;

			out.push({ item, index });
		}

		return out;
	}

	public abstract render(): Promise<AgnosticMessageContent>;
}
