import type { BaseContext } from '../../contexts/BaseContext';
import { PaginationPrompt } from '../PaginationPrompt';

export interface PromptChoice<T> {

}
export class ChoicePrompt<T> extends PaginationPrompt<T> {
	public constructor(ctx: BaseContext, choices: Array<PromptChoice<T>>) {
		super(ctx);
	}
}
