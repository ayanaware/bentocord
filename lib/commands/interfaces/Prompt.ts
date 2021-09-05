import type { CommandContext } from '../CommandContext';

export type PromptValidate<T> = (input: string) => Promise<T | Array<T>>;

export interface Prompt<T extends unknown = unknown> {
	options: PromptOptions;

	validate: PromptValidate<T>;

	resolve: (value?: T) => void;
	reject: (reason?: any) => void;

	refresh: () => void;

	timeout?: NodeJS.Timeout;
	attempt?: number;
}

export interface PromptOptions {
	channelId?: string;
	userId?: string;

	ctx?: CommandContext;
	time?: number;
}

export interface PromptChoice<T extends unknown = unknown> {
	display: string;
	value: T;

	match?: Array<string>;
}
