import { EntityAPI } from '@ayanaware/bento';

import { APIApplicationCommandInteraction, InteractionResponseType } from 'discord-api-types';
import {
	BaseData,
	Guild,
	GuildTextableChannel,
	Member,
	Message,
	MessageContent,
	MessageFile,
	TextableChannel,
	TextChannel,
	User,
} from 'eris';

import { BentocordInterface } from '../BentocordInterface';
import { Discord } from '../discord/Discord';
import { PromptManager } from '../prompt/PromptManager';

import { INTERACTION_MESSAGE, INTERACTION_RESPONSE } from './constants/API';
import type { Command } from './interfaces/Command';

export abstract class CommandContext {
	private readonly api: EntityAPI;

	public readonly command: Command;
	public type: 'message' | 'interaction';

	public authorId: string;
	public author: User;

	public channelId: string;
	public channel?: TextableChannel;

	public guildId?: string;
	public guild?: Guild;

	public member?: Member;

	public readonly interface: BentocordInterface;
	public readonly discord: Discord;
	public readonly promptManager: PromptManager;

	public constructor(api: EntityAPI, command: Command) {
		this.api = api;
		this.command = command;

		// Entities
		this.discord = api.getEntity(Discord);

		this.interface = api.getEntity(BentocordInterface);
		this.promptManager = api.getEntity(PromptManager);
	}

	/**
	 * Check if command author is a owner
	 */
	public async isOwner(): Promise<boolean> {
		return this.interface.isOwner(this.authorId);
	}

	public abstract createResponse(content: MessageContent): Promise<unknown>;
	public abstract editResponse(content: MessageContent): Promise<unknown>;
}

export class InteractionCommandContext extends CommandContext {
	public type: 'interaction' = 'interaction';
	public interaction: APIApplicationCommandInteraction;

	public channel?: GuildTextableChannel;

	private hasResponded = false;

	public constructor(api: EntityAPI, command: Command, interaction: APIApplicationCommandInteraction) {
		super(api, command);
		this.interaction = interaction;

		const client = this.discord.client;

		this.channelId = interaction.channel_id;

		if (interaction.guild_id) {
			this.authorId = interaction.member.user.id;
			this.author = new User(interaction.member.user as unknown as BaseData, client);

			this.guildId = interaction.guild_id;

			const guild = client.guilds.get(interaction.guild_id);
			if (guild) this.guild = guild;

			const member = guild.members.get(this.authorId);
			if (member) this.member = member;

			const channel = guild.channels.get(interaction.channel_id) as GuildTextableChannel;
			if (channel) this.channel = channel;
		} else {
			this.authorId = interaction.user.id;
			this.author = new User(interaction.user as unknown as BaseData, client);

			this.channel = client.getChannel(interaction.channel_id) as TextChannel;
		}
	}

	public async createResponse(content: MessageContent): Promise<unknown> {
		if (this.hasResponded) return this.editResponse(content);

		if (typeof content === 'string') content = { content };
		// TODO: handle allowed_mentions

		const response = {
			type: InteractionResponseType.ChannelMessageWithSource,
			data: content,
		};

		const client = this.discord.client;
		await client.requestHandler.request('POST', INTERACTION_RESPONSE(this.interaction.id, this.interaction.token), false, response as any);
		this.hasResponded = true;
	}

	public async editResponse(content: MessageContent): Promise<unknown> {
		if (!this.hasResponded) return this.createResponse(content);

		if (typeof content === 'string') content = { content };
		// TODO: handle allowed_mentions

		const client = this.discord.client;
		await client.requestHandler.request('PATCH', INTERACTION_MESSAGE(this.discord.application.id, this.interaction.token, '@original'), true, content);
	}
}

export class MessageCommandContext extends CommandContext {
	public prefix: string;
	public type: 'message' = 'message';

	public message: Message;

	private responseId: string = null;

	public constructor(api: EntityAPI, command: Command, message: Message) {
		super(api, command);

		this.message = message;

		this.channelId = message.channel.id;
		this.channel = message.channel;

		this.authorId = message.author.id;
		this.author = message.author;

		if ((message.channel as TextChannel).guild) {
			const guild = (message.channel as TextChannel).guild;

			this.guildId = guild.id;
			this.guild = guild;

			if (message.member) this.member = message.member;
		}
	}

	public async createResponse(content: MessageContent, file?: MessageFile): Promise<unknown> {
		const message = await this.channel.createMessage(content, file);
		this.responseId = message.id;

		return message;
	}

	public async editResponse(content: MessageContent): Promise<unknown> {
		if (!this.responseId) return this.createResponse(content);

		return this.channel.editMessage(this.responseId, content);
	}
}
