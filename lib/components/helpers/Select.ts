import { Constants, SelectMenu, SelectMenuOptions } from 'eris';

import { AnyContext } from '../../contexts/AnyContext';
import { ComponentHandler, SelectHandler } from '../interfaces/ComponentHandler';

import { BaseComponent } from './BaseComponent';
import { PossiblyTranslatable } from '../../interfaces/Translatable';

const { ComponentTypes } = Constants;

export type SelectOption = SelectMenuOptions;
export interface SelectOptionTranslatable extends Omit<SelectOption, 'label' | 'description'> {
	label: PossiblyTranslatable;
	description?: PossiblyTranslatable;
}


export class Select extends BaseComponent {
	public definition: SelectMenu;
	public handler?: ComponentHandler;

	public readonly maxOptions = 25;

	public constructor(ctx: AnyContext, customId: string, handler?: SelectHandler) {
		super(ctx, customId, handler as ComponentHandler);

		this.definition.type = ComponentTypes.SELECT_MENU;
		this.definition.options = [];
	}

	public clearOptions(): this {
		this.definition.options = [];
		return this;
	}

	public setOptions(options: Array<SelectOption>): this {
		if (options.length > this.maxOptions) throw new Error(`setOptions: Cannot have more then ${this.maxOptions} options`);

		// truncate option label if longer then 100 characters
		for (const option of options) {
			if (option.label.length > 100) option.label = option.label.slice(0, 100);
		}

		this.definition.options = options;
		return this;
	}

	public async setOptionsTranslated(options: Array<SelectOptionTranslatable>): Promise<this> {
		const transform: Array<SelectOption> = [];
		for (const option of options) {
			let label = option.label;
			if (typeof label === 'object') label = await this.ctx.formatTranslation(label);

			let description = option.description;
			if (typeof description === 'object') description = await this.ctx.formatTranslation(description);

			transform.push({ ...option, label, description });
		}

		return this.setOptions(transform);
	}

	public addOptions(options: Array<SelectMenuOptions>): this {
		const existing = this.definition.options.length;
		if (existing + options.length > this.maxOptions) throw new Error(`Cannot have more then ${this.maxOptions} options`);

		this.definition.options = [...this.definition.options, ...options];
		return this;
	}

	public addOption(option: SelectMenuOptions): this {
		return this.addOptions([option]);
	}

	public placeholder(placeholder: string): this {
		this.definition.placeholder = placeholder;
		return this;
	}

	public async placeholderTranslated(key: string, repl?: Record<string, unknown>, backup?: string): Promise<this> {
		return this.placeholder(await this.ctx.formatTranslation(key, repl, backup));
	}

	public min(min: number): this {
		this.definition.min_values = min;
		return this;
	}

	public max(max: number): this {
		this.definition.max_values = max;
		return this;
	}
}
