import { Constants, SelectMenu, SelectMenuOptions } from 'eris';

import { AnyContext } from '../../contexts/AnyContext';
import { ComponentHandler, SelectHandler } from '../interfaces/ComponentHandler';

import { BaseComponent } from './BaseComponent';

const { ComponentTypes } = Constants;

export class Select extends BaseComponent {
	public definition: SelectMenu;
	public handler?: ComponentHandler;

	public constructor(ctx: AnyContext, customId: string, handler?: SelectHandler) {
		super(ctx, customId, handler as ComponentHandler);

		this.definition.type = ComponentTypes.SELECT_MENU;
		this.definition.options = [];
	}

	public options(...options: Array<SelectMenuOptions>): this {
		this.definition.options = options;
		return this;
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
