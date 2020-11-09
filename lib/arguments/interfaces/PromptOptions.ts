import { CommandContext } from '../../commands';
import { Argument } from './Argument';

export interface PromptOptions {
	startText: string | ((ctx: CommandContext, arg: Argument) => string);
	retryText?: string | ((ctx: CommandContext, arg: Argument) => string);
	timeoutText?: string | ((ctx: CommandContext, arg: Argument) => string);
	endedText?: string | ((ctx: CommandContext, arg: Argument) => string);
	retries?: number;
	timeout?: number;
}
