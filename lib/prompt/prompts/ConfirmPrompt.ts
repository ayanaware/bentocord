import { ButtonContext } from '../../components/contexts/ButtonContext';
import { Button } from '../../components/helpers/Button';
import type { AnyContext } from '../../contexts/AnyContext';
import { PaginationPrompt } from '../PaginationPrompt';
import { AnyPaginator } from '../helpers/AnyPaginator';
export class ConfirmPrompt extends PaginationPrompt<boolean, void> {
	protected btnYes: Button;
	protected btnNo: Button;

	public constructor(ctx: AnyContext, paginator?: AnyPaginator<void>) {
		super(ctx, paginator);

		this.validator = this.handleText.bind(this);
	}

	public async start(): Promise<boolean> {
		// add buttons
		this.btnYes = await new Button(this.ctx, 'yes', this.yes.bind(this))
			.success().labelTranslated('WORD_YES', null, 'Yes');

		this.btnNo = await new Button(this.ctx, 'no', this.no.bind(this))
			.danger().labelTranslated('WORD_NO', null, 'No');

		// Pagination.start() calls update
		return super.start();
	}

	public async close(): Promise<void> {
		await this.cleanup();

		// confirm close needs to resolve with false
		this.resolve(false);
	}

	public async draw(): Promise<void> {
		this.clearRows();

		// draw pagination
		await super.draw();

		// add yes/no
		this.addRow([this.btnYes, this.btnNo]);
	}

	protected async yes(btn?: ButtonContext): Promise<void> {
		if (btn) await btn.deferUpdate();
		await this.cleanup();

		this.resolve(true);
	}

	protected async no(btn?: ButtonContext): Promise<void> {
		if (btn) await btn.deferUpdate();
		await this.cleanup();

		this.resolve(false);
	}

	protected async handleText(response: string): Promise<[boolean, boolean]> {
		if (/^(true|t|yes|y|1)$/i.exec(response)) {
			await this.cleanup();
			return [true, true];
		} else if (/^(false|f|no|n|0)$/i.exec(response)) {
			await this.cleanup();
			return [true, false];
		}

		return super.handleText(response);
	}
}
