import { Message } from 'eris';

import type { CommandContext } from '../../commands/CommandContext';
import { Translateable } from '../../interfaces/Translateable';
import { PROMPT_CLOSE } from '../Prompt';

import { PaginationOptions, PaginationPrompt } from './PaginationPrompt';

export interface PromptChoice<T> {
	name: string | Translateable;
	value: T;

	match?: Array<string>;
}

export class ChoicePrompt<T> extends PaginationPrompt<T> {
	private readonly choices: Array<PromptChoice<T>>;

	public constructor(ctx: CommandContext, choices: Array<PromptChoice<T>>, options: PaginationOptions = {}) {
		// build items & auto include idx in choice.match
		const items: Array<string | Translateable> = [];
		for (let i = 0; i < choices.length; i++) {
			const choice = choices[i];
			items[i] = choice.name;

			// add number to matches
			if (!Array.isArray(choice.match)) choice.match = [];

			const idx = (i + 1).toString();
			if (!choice.match.includes(idx)) choice.match.push(idx);
		}

		super(ctx, items, options);
		this.choices = choices;
	}

	protected async timeout(): Promise<void> {
		this.removeReactions().catch(() => { /* no-op */ });

		const reason = await this.ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED_TIMEOUT') || 'You took too much time to respond.';
		return this.close(reason);
	}

	public async open(content: string | Translateable): Promise<T> {
		if (typeof content === 'object') content = await this.ctx.formatTranslation(content.key, content.repl) || content.backup;
		this.content = content;

		await this.render();

		// not a single page add reactions
		if (!this.isSinglePage) await this.addReactions();

		return this.start();
	}

	public async handleResponse(input: string, message?: Message): Promise<void> {
		const close = PROMPT_CLOSE.some(c => c.toLocaleLowerCase() === input.toLocaleLowerCase());
		if (close) {
			this.deleteMessage(message).catch(() => { /* no-op */ });

			return this.close();
		}

		for (const choice of this.choices) {
			if (!Array.isArray(choice.match)) continue;
			if (choice.match.some(m => m.toLocaleLowerCase() === input.toLocaleLowerCase())) {
				Promise.all([this.removeReactions(), this.deleteMessage(message)]).catch(() => { /* no-op */ });

				return this.resolve(choice.value);
			}
		}

		// nothing matched hand off to super
		return super.handleResponse(input, message);
	}
}
