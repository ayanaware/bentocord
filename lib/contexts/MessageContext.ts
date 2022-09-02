import { EntityAPI } from '@ayanaware/bento';

import { Message } from 'eris';

import { BaseContext } from './BaseContext';

export class MessageContext extends BaseContext {
	public readonly message: Message;
	public get messageId(): string {
		return this.message.id;
	}

	public constructor(api: EntityAPI, message: Message) {
		super(api, message.channel, message.author);

		this.message = message;
	}
}
