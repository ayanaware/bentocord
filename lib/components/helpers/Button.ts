import { Button as ErisButton, ButtonStyles as ButtonStylesType, Constants, PartialEmoji } from 'eris';

import { AnyContext } from '../../contexts/AnyContext';
import { ButtonHandler, ComponentHandler } from '../interfaces/ComponentHandler';

import { BaseComponent } from './BaseComponent';

const { ButtonStyles, ComponentTypes } = Constants;

export class Button extends BaseComponent {
	public definition: ErisButton;

	public constructor(ctx: AnyContext, customId: string, handler?: ButtonHandler) {
		super(ctx, customId, handler as ComponentHandler);

		// set button defaults
		this.definition.type = ComponentTypes.BUTTON;
		this.definition.style = ButtonStyles.PRIMARY;
	}

	public label(label: string): this {
		this.definition.label = label;
		return this;
	}

	public async labelTranslated(key: string, repl?: Record<string, unknown>, backup?: string): Promise<this> {
		return this.label(await this.ctx.formatTranslation(key, repl, backup));
	}

	public emoji(emoji: Partial<PartialEmoji>): this {
		this.definition.emoji = emoji;
		return this;
	}

	// styles
	public style(style: ButtonStylesType): this {
		this.definition.style = style;
		return this;
	}

	public primary(): this {
		return this.style(ButtonStyles.PRIMARY);
	}

	public secondary(): this {
		return this.style(ButtonStyles.SECONDARY);
	}

	public success(): this {
		return this.style(ButtonStyles.SUCCESS);
	}

	public danger(): this {
		return this.style(ButtonStyles.DANGER);
	}
}
