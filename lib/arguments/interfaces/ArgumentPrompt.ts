import type { ArgumentCallable } from '../types/Callable';

export interface ArgumentPrompt {
	startText: ArgumentCallable;
	retryText?: ArgumentCallable;
	timeoutText?: ArgumentCallable;
	endedText?: ArgumentCallable;
	retries?: number;
	timeout?: number;
}
