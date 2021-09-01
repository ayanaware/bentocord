import { PromptRejectType } from '../constants/PromptRejectType';

import { PromptOptions } from './PromptOptions';

export interface Prompt {
	channelId: string;
	userId: string;
	messageIds: Array<string>;

	options: PromptOptions;
	attempt?: number;

	resolve: (value?: string) => void;
	reject: (reason?: PromptRejectType | any) => void;

	refresh: () => void;
	timeout?: NodeJS.Timeout;
}
