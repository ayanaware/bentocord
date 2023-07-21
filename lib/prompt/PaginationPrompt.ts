/* eslint-disable @typescript-eslint/naming-convention */
import { SelectMenuOptions } from 'eris';

import { ButtonContext } from '../components/contexts/ButtonContext';
import { SelectContext } from '../components/contexts/SelectContext';
import { Button } from '../components/helpers/Button';
import { Select } from '../components/helpers/Select';
import type { BaseContext } from '../contexts/BaseContext';

import { Prompt, PromptOptions } from './Prompt';
import { AnyPaginator } from './helpers/AnyPaginator';

export interface PaginationOptions extends PromptOptions {
	/** always force showing page selector; even if there is less then 5 pages */
	forcePageSelect?: boolean;
}

export enum PaginationEmojis {
	FIRST = '⏮️',
	PREV = '◀️',
	NEXT = '▶️',
	LAST = '⏭️',
	CLOSE = '✖️',
}

const TEXT_FIRST = ['<<', 'first', 'f'];
const TEXT_PREV = ['<', 'prev', 'previous'];
const TEXT_NEXT = ['>', 'next'];
const TEXT_LAST = ['>>', 'last', 'l'];

export class PaginationPrompt<T = void, U = T> extends Prompt<T> {
	public readonly paginator: AnyPaginator<U>;
	protected options: PaginationOptions;

	// first, prev, next, last
	protected btnFirst: Button;
	protected btnPrev: Button;
	protected btnNext: Button;
	protected btnLast: Button;
	protected btnClose: Button;
	protected sltPage: Select;

	public constructor(ctx: BaseContext, paginator?: AnyPaginator<U>, options?: PaginationOptions) {
		super(ctx, null, options);
		this.paginator = paginator;
		this.validator = this.handleText.bind(this);

		this.btnFirst = new Button(this.ctx, 'bc:page:first', this.handleButton.bind(this))
			.secondary().emoji({ name: PaginationEmojis.FIRST });

		this.btnPrev = new Button(this.ctx, 'bc:page:prev', this.handleButton.bind(this))
			.secondary().emoji({ name: PaginationEmojis.PREV });

		this.btnNext = new Button(this.ctx, 'bc:page:next', this.handleButton.bind(this))
			.secondary().emoji({ name: PaginationEmojis.NEXT });

		this.btnLast = new Button(this.ctx, 'bc:page:last', this.handleButton.bind(this))
			.secondary().emoji({ name: PaginationEmojis.LAST });

		this.btnClose = new Button(this.ctx, 'bc:page:close', this.handleButton.bind(this))
			.danger().emoji({ name: PaginationEmojis.CLOSE });

		this.sltPage = new Select(this.ctx, 'bc:page:select', this.handleSelect.bind(this))
			.max(1);
	}

	public async start(): Promise<T> {
		await this.sltPage.placeholderTranslated('BENTOCORD_PAGINATION_SELECT', {}, 'Jump to Page');

		return super.start();
	}

	public async close(): Promise<void> {
		await this.cleanup();

		// raw pagination doesn't return anything
		return this.resolve();
	}

	public async draw(): Promise<void> {
		// get pagination content
		const paginator = this.paginator;
		if (!paginator) return;

		// clear components
		this.clearRows();

		// render page
		// merged by ComponentOperation.render()
		this._merge = await paginator.render();

		// less then 2 pages; no need to display pagination controls
		if (this.paginator.pageCount < 2) return;

		// update state & add buttons
		this.addRow([
			this.btnFirst.enable(paginator.hasPrev),
			this.btnPrev.enable(paginator.hasPrev),
			this.btnNext.enable(paginator.hasNext),
			this.btnLast.enable(paginator.hasNext),
			this.btnClose,
		]);

		// Add page selector
		const page = this.paginator.page;
		const pageCount = this.paginator.pageCount;
		if (!(this.options?.forcePageSelect ?? false) && pageCount < 5) return;

		const padding = Math.floor(this.sltPage.maxOptions / 2);

		let start = page - padding;
		let end = page + padding;

		// went past 0, add leftover to end
		if (start < 0) {
			const pastStart = Math.abs(start);
			start = 0;
			end += pastStart;
		}

		// went past end, add leftover to start
		if (end > pageCount - 1) {
			const pastEnd = end - pageCount - 1;
			start -= pastEnd;
		}

		// constrain start & end
		if (start < 0) start = 0;
		if (end > pageCount - 1) end = pageCount - 1;

		// update select options
		const options: Array<SelectMenuOptions> = [];
		for (let i = start; i <= end; i++) {
			const option: SelectMenuOptions = { value: i.toString(), label: (i + 1).toString(), default: i === page };
			if (this.paginator.options.itemsPerPage === 1) {
				const { item } = await this.paginator.getItem(i);

				// label
				let label = item.label ?? (i + 1).toString();
				if (typeof label === 'object') label = await this.ctx.formatTranslation(label);
				option.label = label;

				// description
				let description = item.description;
				if (typeof description === 'object') description = await this.ctx.formatTranslation(description);
				option.description = description;

				// emoji
				if (item.emoji) option.emoji = item.emoji;
			}

			options.push(option);
		}

		this.sltPage.setOptions(options);
		this.addRow([this.sltPage]);
	}

	protected async handleButton(btn: ButtonContext): Promise<void> {
		if (!this.paginator) return;

		const action = btn.parseCustomId();
		switch (action.id) {
			case 'first': {
				this.paginator.page = 0;
				break;
			}

			case 'prev': {
				this.paginator.page--;
				break;
			}

			case 'next': {
				this.paginator.page++;
				break;
			}

			case 'last': {
				this.paginator.page = this.paginator.pageCount - 1;
				break;
			}

			case 'close':
			default: {
				return this.close();
			}
		}

		return btn.updateMessage(await this.build(), this._files);
	}

	protected async handleSelect(slt: SelectContext): Promise<void> {
		if (slt.values.length !== 1) return;

		const page = Number(slt.values[0]);
		if (isNaN(page)) return;

		this.paginator.page = page;

		return slt.updateMessage(await this.build(), this._files);
	}

	protected async handleText(response: string): Promise<[boolean, T]> {
		if (!this.paginator) return [null, null];

		response = response.toLocaleLowerCase();

		// Using arrays to allow localization in the future
		if (TEXT_FIRST.includes(response)) {
			this.paginator.page = 0;
		} else if (TEXT_PREV.includes(response)) {
			this.paginator.page--;
		} else if (TEXT_NEXT.includes(response)) {
			this.paginator.page++;
		} else if (TEXT_LAST.includes(response)) {
			this.paginator.page = this.paginator.pageCount - 1;
		} else {
			// check for p{num} syntax
			const matches = /^p\s?(\d+)/.exec(response);
			if (!matches) return [null, null];

			const page = Number(matches[1]);
			if (isNaN(page)) return [null, null];

			this.paginator.page = page - 1;
		}

		// refresh timeout, valid text page swap
		this.refreshTimeout();

		await this.render();

		// validator; take no action
		return [null, null];
	}
}
