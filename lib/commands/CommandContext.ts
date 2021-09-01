import { APIApplicationCommandInteraction, APIApplicationCommandInteractionDataOptionWithValues, APIApplicationCommandOption } from 'discord-api-types';
import { Guild, GuildTextableChannel, Member, Message, MessageContent, MessageFile, TextableChannel, TextChannel, User } from 'eris';

import { BentocordInterface, MessageSnowflakes } from '../BentocordInterface';
import { Discord } from '../discord/Discord';
import { PromptManager } from '../prompt/PromptManager';

import { INTERACTION_MESSAGE, INTERACTION_RESPONSE } from './constants/API';
import type { CommandEntity } from './interfaces/CommandEntity';

export abstract class CommandContext {
	public command: CommandEntity;
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

	public constructor(command: CommandEntity) {
		this.command = command;

		// Entities
		this.discord = this.command.api.getEntity(Discord);

		this.interface = this.command.api.getEntity(BentocordInterface);
		this.promptManager = this.command.api.getEntity(PromptManager);
	}

	/**
	 * Check if command author is a owner
	 */
	public async isOwner(): Promise<boolean> {
		return this.interface.isOwner(this.authorId);
	}

	public abstract createResponse(content: MessageContent, file?: MessageFile): Promise<unknown>;
	public abstract editResponse(content: MessageContent): Promise<unknown>;
}

export class InteractionCommandContext extends CommandContext {
	public type: 'interaction' = 'interaction';

	public interaction: APIApplicationCommandInteraction;

	public channel?: GuildTextableChannel;

	private hasResponded = false;

	public constructor(command: CommandEntity, interaction: APIApplicationCommandInteraction) {
		super(command);

		this.interaction = interaction;

		const client = this.discord.client;

		this.authorId = interaction.member ? interaction.member.id : interaction.user.id;
		this.author = new User(interaction.member ? interaction.member : interaction.user, client);

		this.channelId = interaction.channel_id;

		if (interaction.guild_id) {
			this.guildId = interaction.guild_id;

			const guild = client.guilds.get(interaction.guild_id);
			if (guild) this.guild = guild;

			const channel = guild.channels.get(interaction.channel_id) as GuildTextableChannel;
			if (channel) this.channel = channel;

			const member = guild.members.get(this.authorId);
			if (member) this.member = member;
		} else {
			this.channel = client.getChannel(interaction.channel_id) as TextChannel;
		}
	}

	public async createResponse(content: MessageContent, file?: MessageFile): Promise<unknown> {
		if (this.hasResponded) return this.editResponse(content);

		if (typeof content === 'string') content = { content };
		// TODO: handle allowed_mentions

		const response:  = {
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			data: content,
		};

		const client = this.discord.client;
		await client.requestHandler.request('POST', INTERACTION_RESPONSE(this.interaction.id, this.interaction.token), false, response as any, file);
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

	public constructor(command: CommandEntity, message: Message) {
		super(command);

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
