import { CommandContext } from '../../commands';
import { Argument } from './Argument';

export interface ArgumentPrompt {
	startText: string | ((ctx: CommandContext, arg: Argument) => string);
	retryText?: string | ((ctx: CommandContext, arg: Argument) => string);
	timeoutText?: string | ((ctx: CommandContext, arg: Argument) => string);
	endedText?: string | ((ctx: CommandContext, arg: Argument) => string);
	retries?: number;
	timeout?: number;
}
