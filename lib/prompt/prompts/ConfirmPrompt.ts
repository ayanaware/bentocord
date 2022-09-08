import { ButtonContext } from '../../components/contexts/ButtonContext';
import { Button } from '../../components/helpers/Button';
import type { AnyContext } from '../../contexts/AnyContext';
import { Prompt } from '../Prompt';

export class ConfirmPrompt extends Prompt<boolean> {
	public constructor(ctx: AnyContext) {
		super(ctx);

		this.validator = this.handleText.bind(this);
	}

	public async start(): Promise<boolean> {
		// add buttons
		this.rows([
			await new Button(this.ctx, 'yes', this.yes.bind(this))
				.success().labelTranslated('WORD_YES', null, 'Yes'),
			await new Button(this.ctx, 'no', this.no.bind(this))
				.danger().labelTranslated('WORD_NO', null, 'No'),
		]);

		return super.start();
	}

	protected async yes(btn?: ButtonContext): Promise<void> {
		if (btn) await btn.deferUpdate();
		await this.close();

		this.resolve(true);
	}

	protected async no(btn?: ButtonContext): Promise<void> {
		if (btn) await btn.deferUpdate();
		await this.close();

		this.resolve(false);
	}

	protected async handleText(response: string): Promise<[boolean, boolean]> {
		if (/^(true|t|yes|y|1)$/i.exec(response)) {
			await this.close();
			return [true, true];
		} else if (/^(false|f|no|n|0)$/i.exec(response)) {
			await this.close();
			return [true, false];
		}

		return [false, null];
	}
}
