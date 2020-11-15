import { PromptRejectType } from '../constants';
import { PromptOptions } from './PromptOptions';

export interface Prompt {
	channelId: string;
	userId: string;
	messageIds: Array<string>;

	options: PromptOptions;
	attempt?: number;

	resolve: (value?: string) => void;
	reject: (reason?: PromptRejectType) => void;

	refresh: () => void;
	timeout?: NodeJS.Timeout;
}
