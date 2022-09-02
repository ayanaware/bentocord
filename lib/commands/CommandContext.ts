import { EntityAPI } from '@ayanaware/bento';

import { CommandInteraction, Message } from 'eris';

import { InteractionContext } from '../contexts/InteractionContext';
import { MessageContext } from '../contexts/MessageContext';

import type { Command } from './interfaces/Command';

export type AnyCommandContext = MessageCommandContext | InteractionCommandContext;

export class MessageCommandContext extends MessageContext {
	public prefix: string;
	public alias: string;

	public readonly command: Command;

	public constructor(api: EntityAPI, message: Message, command: Command) {
		super(api, message);

		this.command = command;
	}

	public async deleteExecutionMessage(): Promise<void> {
		return this.message.delete();
	}
}

export class InteractionCommandContext extends InteractionContext {
	public alias: string;
	public readonly command: Command;

	public constructor(api: EntityAPI, interaction: CommandInteraction, command: Command) {
		super(api, interaction);

		this.command = command;
	}

	public async deleteExecutionMessage(): Promise<void> {
		if (!this.interaction.acknowledged) await this.defer();

		this.responseId = null;
		return this.interaction.deleteOriginalMessage();
	}
}
