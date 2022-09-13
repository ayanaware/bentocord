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

	/**
	 * Set component as disabled.
	 * @param set Optional Helper, Explicity set disabled state
	 */
	public disable(set?: boolean): this {
		if (typeof set === 'boolean') this.definition.disabled = set;
		else this.definition.disabled = true;

		return this;
	}

	/**
	 * Set component as enabled, or rather, not disabled.
	 * @param set Optional Helper, Explicity set enabled state
	 */
	public enable(set?: boolean): this {
		if (typeof set !== 'boolean') set = true;
		return this.disable(!set);
	}
}
