import { Button as ErisButton, ButtonStyles as ButtonStylesType, Constants, PartialEmoji, SelectMenu } from 'eris';

import { AnyContext } from '../../contexts/AnyContext';
import { ComponentHandler } from '../interfaces/ComponentHandler';

export class BaseComponent {
	protected readonly ctx: AnyContext;

	public definition: Partial<ErisButton | SelectMenu>;
	public handler?: ComponentHandler;

	public constructor(ctx: AnyContext, customId: string, handler?: ComponentHandler) {
		this.ctx = ctx;

		// eslint-disable-next-line @typescript-eslint/naming-convention
		this.definition = { custom_id: customId, disabled: false };

		if (handler) this.handler = handler;
	}

	public disable(): this {
		this.definition.disabled = true;
		return this;
	}

	public enable(): this {
		this.definition.disabled = false;
		return this;
	}
}
