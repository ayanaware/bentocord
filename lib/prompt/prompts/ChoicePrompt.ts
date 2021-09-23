import { Message } from 'eris';

import type { CommandContext } from '../../commands/CommandContext';
import { Translateable } from '../../interfaces/Translateable';

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
	}

	public async handleResponse(input: string, message?: Message): Promise<void> {
		for (const choice of this.choices) {
			if (!Array.isArray(choice.match)) continue;
			if (choice.match.some(m => m.toLocaleLowerCase() === input.toLocaleLowerCase())) {
				this.resolve(choice.value);

				await this.deleteMessage(message);

				return;
			}
		}

		// nothing matched hand off to super
		return super.handleResponse(input, message);
	}
}
