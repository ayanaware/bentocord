import { EntityAPI } from '@ayanaware/bento';

import { CommandInteraction, ComponentInteraction, FileContent, InteractionContent, Message } from 'eris';

import { BaseContext } from './BaseContext';

export class InteractionContext<C = InteractionContent> extends BaseContext<C> {
	public interaction: CommandInteraction | ComponentInteraction;

	public constructor(api: EntityAPI, interaction: CommandInteraction | ComponentInteraction) {
		super(api, interaction.channel, interaction.user ?? interaction.member.user);

		this.interaction = interaction;
	}

	public async defer(flags?: number): Promise<void> {
		if (this.interaction.acknowledged) return;

		this.responseId = '@original';
		return this.interaction.defer(flags);
	}

	public async getResponse(): Promise<Message> {
		if (this.responseId === '@original') return this.interaction.getOriginalMessage();
		return this.discord.client.getMessage(this.channelId, this.responseId);
	}

	public async createResponse(response: C, files?: Array<FileContent>, flags?: number): Promise<void> {
		if (this.interaction.acknowledged) return this.editResponse(response, files);

		this.responseId = '@original';
		await this.interaction.createMessage(response, files);
	}

	public async editResponse(response: C, files?: Array<FileContent>): Promise<void> {
		if (!this.interaction.acknowledged) return this.createResponse(response, files);

		// create a new message
		if (!this.responseId) {
			const message = await this.interaction.createFollowup(response, files);
			this.responseId = message.id;
			return;
		}

		try {
			await this.interaction.editMessage(this.responseId, response, files);
		} catch (e) {
			// issue editing, create a brand new message
			const message = await this.interaction.createFollowup(response, files);
			this.responseId = message.id;
		}
	}

	public async deleteResponse(): Promise<void> {
		await this.deleteMessage(this.responseId);
		this.responseId = null;
	}

	public async createMessage(content: C, files?: Array<FileContent>): Promise<Message> {
		if (this.interaction.acknowledged) return this.interaction.createFollowup(content, files);

		// not been acknowledged yet
		await this.interaction.createMessage(content, files);
		return this.interaction.getOriginalMessage();
	}

	public async editMessage(messageId: string, content: C, files?: Array<FileContent>): Promise<Message> {
		return this.interaction.editMessage(messageId, content, files);
	}

	public async deleteMessage(messageId: string): Promise<void> {
		return this.interaction.deleteMessage(messageId);
	}
}
