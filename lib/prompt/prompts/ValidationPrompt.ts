import { CommandContext } from '../../commands/CommandContext';
import { Prompt } from '../Prompt';

export type PromptValidate<T> = (input: string) => Promise<T>;

export class ValidationPrompt<T = string> extends Prompt {
	protected resolve: (value: T | PromiseLike<T>) => void;

	protected validate: PromptValidate<T>;
	protected attempt = 0;

	public constructor(ctx: CommandContext, validate: PromptValidate<T>) {
		super(ctx);
		this.validate = validate;
	}

	public async handleResponse(input: string): Promise<void> {
		const close = ['exit', 'cancel', 'c', ':q'].some(c => c.toLowerCase() === input.toLowerCase());
		if (close) return this.close();

		let result: T;
		if (typeof this.validate === 'function') {
			try {
				result = await this.validate(input);
			} catch (e) {
				return this.close(e.toString());
			}
		}

		// new attempt, extend timeout
		this.refresh();

		// successful result
		if (typeof result != null) return this.resolve(result);

		if (this.attempt++ >= 3) {
			const canceled = await this.ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED_MAX_ATTEMPTS') || 'Max invalid attempts reached.';
			return this.close(canceled);
		}

		const message = await this.ctx.formatTranslation('BENTOCORD_PROMPT_VALIDATE_ERROR') || '**Failed to validate input. Please try again**';
		const content = `${this.content}\n\n${message}`;

		await this.ctx.createResponse({ content });
	}
}
