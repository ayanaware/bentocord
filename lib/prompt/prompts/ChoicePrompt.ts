import { SelectMenuOptions } from 'eris';

import { NON_ERROR_HALT } from '../../commands/constants/CommandManager';
import { SelectContext } from '../../components/contexts/SelectContext';
import { Select } from '../../components/helpers/Select';
import type { BaseContext } from '../../contexts/BaseContext';
import { PossiblyTranslatable } from '../../interfaces/Translatable';
import { PaginationPrompt } from '../PaginationPrompt';
import { PromptOptions } from '../Prompt';
import { CodeblockPaginator } from '../helpers/CodeblockPaginator';
import { PaginatorItem } from '../helpers/Paginator';

export interface ChoicePromptChoice<T> extends PaginatorItem<T> {
	value: T;

	match?: Array<string>;
}

export class ChoicePrompt<T> extends PaginationPrompt<T> {
	protected choices: Array<ChoicePromptChoice<T>>;
	protected sltChoice: Select;

	public constructor(ctx: BaseContext, choices: Array<ChoicePromptChoice<T>>, options?: PromptOptions) {
		const paginator = new CodeblockPaginator(ctx, choices);
		super(ctx, paginator, options);
		this.validator = this.handleText.bind(this);

		this.choices = choices;

		this.sltChoice = new Select(this.ctx, 'choice', this.handleChoice.bind(this))
			.max(1);
	}

	public async start(): Promise<T> {
		await this.sltChoice.placeholderTranslated('BENTOCORD_CHOICE_SELECT', {}, 'Please choose an item');

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

		const items = await this.paginator.getPageItems();
		const options: Array<SelectMenuOptions> = items.map(i => ({ ...i,
			label: `${i.index + 1}: ${i.label}`, // prefix label with items 1-index number
			value: i.index.toString(),
		}));
		this.sltChoice.options(...options);

		// add choice
		this.addRows([this.sltChoice]);
	}

	protected async handleChoice(slt: SelectContext): Promise<void> {
		if (slt.values.length !== 1) return;

		const index = Number(slt.values[0]);
		if (isNaN(index)) return;

		await slt.deferUpdate();

		const choice = this.choices[index];
		if (!choice) return;

		await this.cleanup();
		this.resolve(choice.value);
	}

	protected async handleText(response: string): Promise<[boolean, T]> {
		response = response.toLocaleLowerCase();

		// handle number select
		for (const item of await this.paginator.getPageItems()) {
			const num = item.index + 1; // convert to 1-index
			if (response !== num.toString()) continue;

			await this.cleanup();
			return [true, item.value];
		}

		// handle choice.match
		for (const choice of this.choices) {
			if (!Array.isArray(choice.match)) continue;

			// lowercase
			const match = choice.match.map(m => m.toLocaleLowerCase());
			if (!match.some(m => response === m)) continue;

			await this.cleanup();
			return [true, choice.value];
		}

		return super.handleText(response);
	}
}
