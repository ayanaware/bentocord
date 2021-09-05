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

import type { CommandManager } from './CommandManager';
import { INTERACTION_MESSAGE, INTERACTION_RESPONSE } from './constants/API';
import type { Command } from './interfaces/Command';
import { PromptOptions, PromptValidate } from './interfaces/Prompt';

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

	public readonly manager: CommandManager;

	public constructor(manager: CommandManager, command: Command) {
		this.manager = manager;
		this.api = manager.api;

		this.command = command;

		// Entities
		this.discord = this.api.getEntity(Discord);
		this.interface = this.api.getEntity(BentocordInterface);
	}

	/**
	 * Check if command author is a owner
	 */
	public async isOwner(): Promise<boolean> {
		return this.interface.isOwner(this.authorId);
	}

	/**
	 * Prompt command author for additional input
	 * @param options PromptOptions
	 * @param content Message to display
	 * @param validate Validate their input
	 * @returns Validated input
	 */
	public async prompt<T = unknown>(options: PromptOptions, content: string, validate: PromptValidate<T>): Promise<T> {
		return this.manager.prompt<T>({ ...options, ctx: this }, content, validate);
	}

	/**
	 * Prompt the author for confirmation
	 * @param content Optional message detailing what they are confirming
	 * @returns boolean
	 */
	public async promptConfirm(content?: string): Promise<boolean> {
		return this.prompt<boolean>({}, content || 'Please confirm this action [y/n]:', async (input: string) => {
			if (/^true|t|yes|y|1$/i.exec(input)) return true;

			return false;
		});
	}

	public abstract acknowledge(): Promise<void>;

	public abstract createResponse(content: MessageContent): Promise<unknown>;
	public abstract editResponse(content: MessageContent): Promise<unknown>;
	public abstract deleteResponse(): Promise<void>;
}

export class InteractionCommandContext extends CommandContext {
	public type: 'interaction' = 'interaction';
	public interaction: APIApplicationCommandInteraction;

	public channel?: GuildTextableChannel;

	private hasResponded = false;

	public constructor(manager: CommandManager, command: Command, interaction: APIApplicationCommandInteraction) {
		super(manager, command);
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

	public async acknowledge(): Promise<void> {
		if (this.hasResponded) return;

		const response = {
			type: InteractionResponseType.DeferredChannelMessageWithSource,
		};

		const client = this.discord.client;
		await client.requestHandler.request('POST', INTERACTION_RESPONSE(this.interaction.id, this.interaction.token), false, response);

		this.hasResponded = true;
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

	public async deleteResponse(): Promise<void> {
		if (!this.hasResponded) return;

		const client = this.discord.client;
		await client.requestHandler.request('DELETE', INTERACTION_MESSAGE(this.discord.application.id, this.interaction.token, '@original'));
	}
}

export class MessageCommandContext extends CommandContext {
	public prefix: string;
	public type: 'message' = 'message';

	public message: Message;

	private responseId: string = null;

	public constructor(manager: CommandManager, command: Command, message: Message) {
		super(manager, command);

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

	public async acknowledge(): Promise<void> {
		// NO-OP on Message Context
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

	public async deleteResponse(): Promise<void> {
		if (!this.responseId) return;

		return this.channel.deleteMessage(this.responseId);
	}
}
