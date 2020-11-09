import { CommandContext } from '../../commands';

export interface PromptOptions {
	startText: string | ((ctx: CommandContext) => string);
	retryText?: string | ((ctx: CommandContext) => string);
	timeoutText?: string | ((ctx: CommandContext) => string);
	endedText?: string | ((ctx: CommandContext) => string);
	retries?: number;
	timeout?: number;
}
