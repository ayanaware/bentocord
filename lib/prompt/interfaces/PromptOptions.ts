export interface PromptOptions {
	validate?: (content: string) => Promise<any>;
	retries?: number;
	retryText?: string;
}
