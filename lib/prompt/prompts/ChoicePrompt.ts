import type { BaseContext } from '../../contexts/BaseContext';
import { PossiblyTranslatable } from '../../interfaces/Translatable';
import { PaginationPrompt } from '../PaginationPrompt';

export interface PromptChoice<T> {
	name: PossiblyTranslatable;
	value: T;

	match?: Array<string>;
}

export class ChoicePrompt<T> extends PaginationPrompt<T> {
	public constructor(ctx: BaseContext, choices: Array<PromptChoice<string>>) {
		super(ctx);

		// SOON TM
	}
}
