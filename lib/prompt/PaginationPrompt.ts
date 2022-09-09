/* eslint-disable @typescript-eslint/naming-convention */
import { SelectMenuOptions } from 'eris';

import { NON_ERROR_HALT } from '../commands/constants/CommandManager';
import { ButtonContext } from '../components/contexts/ButtonContext';
import { SelectContext } from '../components/contexts/SelectContext';
import { Button } from '../components/helpers/Button';
import { Select } from '../components/helpers/Select';
import type { BaseContext } from '../contexts/BaseContext';
import { AgnosticMessageContent } from '../interfaces/AgnosticMessageContent';

import { Prompt } from './Prompt';
import type { Paginator } from './helpers/Paginator';

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

export class PaginationPrompt<T = void> extends Prompt<T> {
	public readonly paginator: Paginator<unknown>;

	// first, prev, next, last
	protected btnFirst: Button;
	protected btnPrev: Button;
	protected btnNext: Button;
	protected btnLast: Button;
	protected btnClose: Button;
	protected sltPage: Select;

	public constructor(ctx: BaseContext, paginator?: Paginator<unknown>) {
		super(ctx);
		this.paginator = paginator;

		this.btnFirst = new Button(this.ctx, 'first', this.handleButton.bind(this))
			.secondary().emoji({ name: PaginationEmojis.FIRST });

		this.btnPrev = new Button(this.ctx, 'prev', this.handleButton.bind(this))
			.secondary().emoji({ name: PaginationEmojis.PREV });

		this.btnNext = new Button(this.ctx, 'next', this.handleButton.bind(this))
			.secondary().emoji({ name: PaginationEmojis.NEXT });

		this.btnLast = new Button(this.ctx, 'last', this.handleButton.bind(this))
			.secondary().emoji({ name: PaginationEmojis.LAST });

		this.btnClose = new Button(this.ctx, 'close', this.handleButton.bind(this))
			.danger().emoji({ name: PaginationEmojis.CLOSE });

		this.sltPage = new Select(this.ctx, 'page', this.handleSelect.bind(this))
			.max(1);

		this.validator = this.handleText.bind(this);
	}

	public async start(): Promise<T> {
		await this.sltPage.placeholderTranslated('BENTOCORD_PAGINATION_JUMP', {}, 'Jump to Page');

		await this.update();
		return super.start();
	}

	public async close(): Promise<void> {
		await this.cleanup();

		// raw pagination doesn't return anything
		this.resolve();
	}

	public async update(): Promise<void> {
		// get pagination content
		const paginator = this.paginator;
		if (!paginator) return super.render();

		// render page
		const result = await paginator.render();
		// merged by ComponentOperation.render()
		this._merge = result.content;

		// clear components
		this.clearRows();

		// single page; no need to display pagination controls
		if (this.paginator.isSinglePage) return super.render();

		// update state & add buttons
		this.addRows([
			this.btnFirst.enable(paginator.hasPrev),
			this.btnPrev.enable(paginator.hasPrev),
			this.btnNext.enable(paginator.hasNext),
			this.btnLast.enable(paginator.hasNext),
			this.btnClose,
		]);

		// Add page selector
		const page = this.paginator.page;
		const pageCount = this.paginator.pageCount;

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
			options.push({ label: (i + 1).toString(), value: i.toString(), default: i === page });
		}

		this.sltPage.options(...options);

		this.addRows([this.sltPage]);
	}

	protected async handleButton(btn: ButtonContext): Promise<void> {
		if (!this.paginator) return;

		// defer update
		await btn.deferUpdate();

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

			case 'close': {
				return this.close();
			}

			default: {
				return;
			}
		}

		await this.update();
		return this.render();
	}

	protected async handleSelect(slt: SelectContext): Promise<void> {
		if (slt.values.length !== 1) return;

		const page = Number(slt.values[0]);
		if (isNaN(page)) return;

		await slt.deferUpdate();
		this.paginator.page = page;

		await this.update();
		return this.render();
	}

	protected async handleText(response: string): Promise<[boolean, T]> {
		if (!this.paginator) return;

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
			if (!matches) return;

			const page = Number(matches[1]);
			if (isNaN(page)) return [null, null];

			this.paginator.page = page - 1;
		}

		// refresh timeout, valid text page swap
		this.refreshTimeout();

		await this.update();
		await this.render();

		// validator; take no action
		return [null, null];
	}
}
