export interface PromptOptions {
	validate?: (content: string) => any | Promise<any>;
	retries?: number;
	retryText?: string;
}
