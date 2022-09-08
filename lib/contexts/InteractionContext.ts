import { EntityAPI } from '@ayanaware/bento';

import { CommandInteraction, ComponentInteraction, FileContent, InteractionContent, Message } from 'eris';

import { IsTextableChannel } from '../util/IsTextableChannel';

import { BaseContext } from './BaseContext';

export class InteractionContext<C = string | InteractionContent> extends BaseContext<C> {
	public interaction: CommandInteraction | ComponentInteraction;

	public constructor(api: EntityAPI, interaction: CommandInteraction | ComponentInteraction) {
		super(api, interaction.channel, interaction.user ?? interaction.member.user);

		this.interaction = interaction;
	}

	public async prepare(): Promise<void> {
		const client = this.discord.client;

		let channel = client.getChannel(this.channelId);
		if (!channel) channel = await client.getRESTChannel(this.channelId);
		if (!IsTextableChannel(channel)) throw new Error('InteractionContext: Channel is not textable.');
		this.channel = channel;

		if (this.interaction.member) {
			this.member = this.interaction.member;
			this.user = this.interaction.member.user;
		} else if (this.interaction.user) {
			this.user = this.interaction.user;
		}

		if (this.interaction.guildID) {
			// attempt to get guild object
			const guild = client.guilds.get(this.interaction.guildID);
			this.guild = guild;

			// attempt to get selfMember
			this.selfMember = guild.members.get(this.selfId);
		}
	}

	public async defer(flags?: number): Promise<void> {
		if (this.interaction.acknowledged) return;

		this.responseId = '@original';
		return this.interaction.defer(flags);
	}

	public async getResponse(): Promise<Message> {
		if (this.responseId === '@original') {
			const original = await this.interaction.getOriginalMessage();
			this.responseId = original.id;
			this.responseMessage = original;

			return original;
		}

		if (this.responseMessage && this.responseMessage.id === this.responseId) return this.responseMessage;

		const message = await this.discord.client.getMessage(this.channelId, this.responseId);
		this.responseMessage = message;

		return message;
	}

	public async createResponse(response: C, files?: Array<FileContent>): Promise<void> {
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
			this.responseMessage = message;
			return;
		}

		try {
			await this.interaction.editMessage(this.responseId, response, files);
		} catch (e) {
			// issue editing, create a brand new message
			const message = await this.interaction.createFollowup(response, files);
			this.responseId = message.id;
			this.responseMessage = message;
		}
	}

	public async deleteResponse(): Promise<void> {
		await this.deleteMessage(this.responseId);

		this.responseId = null;
		this.responseMessage = null;
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
