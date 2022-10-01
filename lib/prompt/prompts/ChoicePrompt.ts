import { SelectMenuOptions } from 'eris';

import { NON_ERROR_HALT } from '../../commands/constants/CommandManager';
import { ButtonContext } from '../../components/contexts/ButtonContext';
import { SelectContext } from '../../components/contexts/SelectContext';
import { Button } from '../../components/helpers/Button';
import { Select } from '../../components/helpers/Select';
import type { BaseContext } from '../../contexts/BaseContext';
import { PossiblyTranslatable } from '../../interfaces/Translatable';
import { PaginationPrompt } from '../PaginationPrompt';
import { PromptOptions } from '../Prompt';
import { AnyPaginator } from '../helpers/AnyPaginator';
import { PaginatorItem } from '../helpers/Paginator';

export interface ChoicePromptChoice<T = unknown> extends PaginatorItem<T> {
	value: T;
}
export class ChoicePrompt<T> extends PaginationPrompt<T> {
	protected sltChoice: Select;
	protected btnChoice: Button;

	public constructor(ctx: BaseContext, paginator: AnyPaginator<T>, options?: PromptOptions) {
		super(ctx, paginator, options);
		this.validator = this.handleText.bind(this);

		this.sltChoice = new Select(this.ctx, 'bc:choice:select', this.handleChoiceSelect.bind(this)).max(1);
		this.btnChoice = new Button(this.ctx, 'bc:choice:button', this.handleChoiceButton.bind(this)).success();
	}

	public async start(): Promise<T> {
		await this.sltChoice.placeholderTranslated('BENTOCORD_CHOICE_SELECT', {}, 'Please choose an item');
		await this.btnChoice.labelTranslated('BENTOCORD_CHOICE_SELECT_CHOOSE', {}, 'Choose');

		return super.start();
	}

	public async close(reason?: PossiblyTranslatable): Promise<void> {
		await this.update();

		// Handle close reason, respect PromptOptions
		if (reason) {
			if (typeof reason === 'object') reason = await this.ctx.formatTranslation(reason);
			if (this.options.showCloseError) {
				if (this.options.closeErrorFollowup) await this.ctx.createMessage(reason);
				else this.content(reason);
			}
		}

		await this.cleanup();
		this.reject(NON_ERROR_HALT);
	}

	public async update(): Promise<void> {
		this.clearRows();

		// update pagination
		await super.update();

		const items = await this.paginator.getItems();
		// single option per page
		if (items.length === 1) {
			this.addRows([this.btnChoice]);

			return;
		}

		// multiple options per page
		const options: Array<SelectMenuOptions> = [];
		for (const { item, index } of items) {
			const option: SelectMenuOptions = { value: index.toString(), label: index.toString() };

			// label
			let label = item.label;
			if (typeof label === 'object') label = await this.ctx.formatTranslation(label);
			option.label = `${index + 1}: ${label}`;

			// description
			let description = item.description;
			if (typeof description === 'object') description = await this.ctx.formatTranslation(description);
			option.description = description;

			// emoji
			if (item.emoji) option.emoji = item.emoji;

			options.push(option);
		}

		this.sltChoice.options(...options);

		// add select
		this.addRows([this.sltChoice]);
	}

	protected async handleChoiceSelect(slt: SelectContext): Promise<void> {
		if (slt.values.length !== 1) return;

		const index = Number(slt.values[0]);
		if (isNaN(index)) return;

		await slt.deferUpdate();

		const [item] = await this.paginator.getItem(index);
		if (!item) return;

		await this.cleanup();
		this.resolve(item.value);
	}

	protected async handleChoiceButton(btn: ButtonContext): Promise<void> {
		const items = await this.paginator.getItems();
		if (items.length !== 1) return;
		const { item } = items[0];
		if (!item) return;

		await btn.deferUpdate();

		await this.cleanup();
		this.resolve(item.value);
	}

	protected async handleText(response: string): Promise<[boolean, T]> {
		response = response.toLocaleLowerCase();

		// handle number select
		const items = await this.paginator.getItems();
		for (const { item, index } of items) {
			// handle text: number
			const num = index + 1; // convert to 1-index
			if (response === num.toString())  {
				await this.cleanup();
				return [true, item.value];
			}

			// handle text: item.match
			if (!Array.isArray(item.match)) continue;

			// lowercase
			const match = item.match.map(m => m.toLocaleLowerCase());
			if (!match.some(m => response === m)) continue;

			await this.cleanup();
			return [true, item.value];
		}

		return super.handleText(response);
	}
}
