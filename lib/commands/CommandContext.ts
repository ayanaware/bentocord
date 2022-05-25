import { EntityAPI } from '@ayanaware/bento';

import {
	AdvancedMessageContentEdit,
	AnyChannel,
	CommandInteraction,
	Constants,
	ExtendedUser,
	FileContent,
	Guild,
	Member,
	Message,
	MessageContent,
	TextableChannel,
	TextChannel,
	User,
} from 'eris';

import { BentocordInterface } from '../BentocordInterface';
import { Discord } from '../discord/Discord';
import { DiscordPermission } from '../discord/constants/DiscordPermission';
import type { Translateable } from '../interfaces/Translateable';
import type { PromptValidate } from '../prompt/Prompt';
import type { PromptManager } from '../prompt/PromptManager';
import type { PromptChoice } from '../prompt/prompts/ChoicePrompt';
import { PaginationOptions } from '../prompt/prompts/PaginationPrompt';

import type { CommandManager } from './CommandManager';
import type { Command } from './interfaces/Command';

const { ChannelTypes } = Constants;

export type AnyCommandContext = CommandContext | MessageCommandContext | InteractionCommandContext;

export abstract class CommandContext {
	private readonly api: EntityAPI;

	public readonly command: Command;
	public type: 'message' | 'interaction';

	public alias: string;

	public authorId: string;
	public author: User;

	public channelId: string;
	public channel?: TextableChannel;

	public guildId?: string;
	public guild?: Guild;

	public member?: Member;

	public messageId?: string;
	public message?: Message;

	/** The bot's user id */
	public selfId: string;
	/** The bot's user object */
	public self: ExtendedUser;
	/** The bot's member object if available */
	public selfMember?: Member;

	public readonly interface: BentocordInterface;
	public readonly discord: Discord;

	public readonly manager: CommandManager;
	public readonly promptManager: PromptManager;

	protected responseId: string;

	public constructor(manager: CommandManager, promptManager: PromptManager, command: Command) {
		this.manager = manager;
		this.api = manager.api;

		this.command = command;
		this.promptManager = promptManager;

		// Entities
		this.discord = this.api.getEntity(Discord);
		this.interface = this.api.getEntity(BentocordInterface);
	}

	protected isTextableChannel(channel: unknown): channel is TextableChannel {
		const cast = channel as AnyChannel;
		if (!cast || typeof cast.type !== 'number') return false;

		const textableIds: Array<number> = [
			ChannelTypes.DM,
			ChannelTypes.GUILD_TEXT, ChannelTypes.GUILD_NEWS,
			ChannelTypes.GUILD_NEWS_THREAD, ChannelTypes.GUILD_PUBLIC_THREAD, ChannelTypes.GUILD_PRIVATE_THREAD,
		];

		return textableIds.includes(cast.type);
	}

	/**
	 * Check if command author is a owner
	 */
	public async isBotOwner(): Promise<boolean> {
		return this.interface.isOwner(this.authorId);
	}

	/**
	 * Format a number based on who/where ran
	 * @param num Number
	 * @returns
	 */
	public async formatNumber(num: number): Promise<string> {
		return this.interface.formatNumber(num, {
			userId: this.authorId || null,
			channelId: this.channelId || null,
			guildId: this.guildId || null,
		});
	}

	/**
	 * Format a date based on who/where ran
	 * @param date Date
	 * @returns Formatted date
	 */
	public async formatDate(date: Date): Promise<string> {
		return this.interface.formatDate(date, {
			userId: this.authorId || null,
			channelId: this.channelId || null,
			guildId: this.guildId || null,
		});
	}

	/**
	 * Format a translation based on who/where ran
	 * @param key Translation Key
	 * @param repl Translation Replacements
	 * @param backup Translation Backup
	 * @returns Formatted translation or null
	 */
	public async formatTranslation(key: string, repl?: Record<string, unknown>, backup?: string): Promise<string> {
		return this.interface.formatTranslation(key, repl, {
			userId: this.authorId || null,
			channelId: this.channelId || null,
			guildId: this.guildId || null,
		}, backup);
	}

	/**
	 * Check if the author has a Discord permission
	 * @param permission DiscordPermission
	 */
	public hasPermission(permission: DiscordPermission): boolean {
		if (!this.channel || !this.guild) return false;
		const channel = this.channel as TextChannel;

		return channel.permissionsOf(this.authorId).has(permission) || false;
	}

	/**
	 * Check if the application has a Discord permission
	 * @param permission DiscordPermission
	 */
	public selfHasPermission(permission: DiscordPermission): boolean {
		if (!this.channel || !this.guild) return false;
		const channel = this.channel as TextChannel;

		return channel.permissionsOf(this.selfId).has(permission) || false;
	}

	/**
	 * Prompt command author for additional input
	 * @param options PromptOptions
	 * @param content Message to display
	 * @param validate Validate their input
	 * @returns Validated input
	 */
	public async prompt<T = string>(content: string | Translateable, validate?: PromptValidate<T>): Promise<T> {
		return this.promptManager.createPrompt<T>(this, content, validate);
	}

	/**
	 * Prompt command author for extra confirmation
	 * @param content details about what they are confirming
	 * @returns boolean
	 */
	public async confirm(content?: string | Translateable, items?: Array<string | Translateable>): Promise<boolean> {
		if (!content) content = await this.formatTranslation('BENTOCORD_PROMPT_CONFIRM', {}, 'Please confirm you wish to continue [y/n]:');
		return this.promptManager.createConfirmPrompt(this, content, items);
	}

	/**
	 * Show a pagination UI
	 * @param items Array of items
	 * @param content details about what they are seeing
	 * @param options PaginationOptions
	 * @returns
	 */
	public async pagination(items: Array<string | Translateable>, content?: string | Translateable, options?: PaginationOptions): Promise<void> {
		return this.promptManager.createPagination(this, items, content, options);
	}

	/**
	 * Prompt command author to select a choice
	 * @param choices Array of PromptChoice
	 * @param content details about what they are choosing
	 * @param options PagiantionOptions
	 * @returns Selected PromptChoice value
	 */
	public async choice<T = string>(choices: Array<PromptChoice<T>>, content?: string | Translateable, options?: PaginationOptions): Promise<T> {
		return this.promptManager.createChoicePrompt<T>(this, choices, content, options);
	}

	/**
	 * Send translated response, getTranstion & createResponse
	 * @param key Translation Key
	 * @param repl Replacements
	 * @param backup Backup
	 * @returns Message/Interaction
	 */
	public async createTranslatedResponse(key: string, repl?: Record<string, unknown>, backup?: string): Promise<unknown> {
		const content = await this.formatTranslation(key, repl, backup);
		return this.createResponse({ content });
	}

	/**
	 * Edit translation response
	 * @param key Translation Key
	 * @param repl Replacements
	 * @param backup Backup
	 * @returns Message/Interaction
	 */
	public async editTranslatedResponse(key: string, repl?: Record<string, unknown>, backup?: string): Promise<unknown> {
		const content = await this.formatTranslation(key, repl, backup);
		return this.editResponse({ content });
	}

	public abstract getResponseId(): Promise<string>;

	public abstract acknowledge(): Promise<void>;

	public abstract createResponse(response: MessageContent, files?: Array<FileContent>): Promise<unknown>;
	public abstract editResponse(response: MessageContent, files?: Array<FileContent>): Promise<unknown>;
	public abstract deleteResponse(): Promise<void>;

	public abstract deleteExecutionMessage(): Promise<void>;

	public abstract createMessage(content: MessageContent, files?: Array<FileContent>): Promise<unknown>;
	public abstract editMessage(messageId: string, content: MessageContent, files?: Array<FileContent>): Promise<unknown>;
	public abstract deleteMessage(messageId: string): Promise<void>;
}

export class InteractionCommandContext extends CommandContext {
	public type: 'interaction' = 'interaction';
	public interaction: CommandInteraction;

	public constructor(manager: CommandManager, promptManager: PromptManager, command: Command, interaction: CommandInteraction) {
		super(manager, promptManager, command);
		this.interaction = interaction;
	}

	public async prepare(): Promise<void> {
		const client = this.discord.client;
		this.self = client.user;
		this.selfId = client.user.id;

		this.channelId = this.interaction.channel.id;

		let channel = client.getChannel(this.channelId);
		if (!channel) channel = await client.getRESTChannel(this.channelId);
		if (!this.isTextableChannel(channel)) throw new Error('InteractionCommandContext: Channel is not textable.');
		this.channel = channel;

		if (this.interaction.guildID) {
			this.authorId = this.interaction.member.user.id;
			this.author = this.interaction.member.user;

			this.member = this.interaction.member;

			this.guildId = this.interaction.guildID;

			const guild = client.guilds.get(this.interaction.guildID);
			if (!guild) throw new Error('InteractionCommandContext: Guild not found');
			this.guild = guild;

			// selfMember
			const selfMember = guild.members.get(client.user.id);
			if (selfMember) this.selfMember = selfMember;
		} else {
			this.authorId = this.interaction.user.id;
			this.author = this.interaction.user;
		}
	}

	public async getResponseId(): Promise<string> {
		if (this.responseId !== '@original') return this.responseId;

		const message = await this.interaction.getOriginalMessage();
		this.message = message;
		this.messageId = message.id;
		this.responseId = message.id;

		return this.responseId;
	}

	public async acknowledge(): Promise<void> {
		if (this.interaction.acknowledged) return;

		await this.interaction.acknowledge();
		this.responseId = '@original';
	}

	public async createResponse(response: MessageContent, files?: Array<FileContent>): Promise<unknown> {
		if (this.interaction.acknowledged) return this.editResponse(response, files);

		await this.interaction.createMessage(response, files);
		this.responseId = '@original';
	}

	public async editResponse(response: MessageContent, files?: Array<FileContent>): Promise<unknown> {
		if (!this.interaction.acknowledged) return this.createResponse(response, files);

		if (!this.responseId) {
			// create a new message
			const msg = await this.interaction.createFollowup(response, files);
			this.responseId = msg.id;

			return msg;
		}

		try {
			return await this.interaction.editMessage(this.responseId, response, files);
		} catch (e) {
			// issue editing, create a new message
			const msg = await this.interaction.createFollowup(response, files);
			this.responseId = msg.id;

			return msg;
		}
	}

	public async deleteResponse(): Promise<void> {
		if (!this.responseId) return;

		if (this.responseId === '@original') await this.interaction.deleteOriginalMessage();
		else await this.interaction.deleteMessage(this.responseId);

		this.responseId = null;
	}

	public async deleteExecutionMessage(): Promise<void> {
		if (!this.interaction.acknowledged) await this.acknowledge();

		try {
			await this.interaction.deleteOriginalMessage();
			this.responseId = null;
		} catch { /* NO-OP */ }
	}

	public async createMessage(content: MessageContent, files?: Array<FileContent>): Promise<unknown> {
		return this.interaction.createFollowup(content, files);
	}

	public async editMessage(messageId: string, content: MessageContent, files?: Array<FileContent>): Promise<unknown> {
		return this.interaction.editMessage(messageId, content, files);
	}

	public async deleteMessage(messageId: string): Promise<void> {
		return this.interaction.deleteMessage(messageId);
	}
}

export class MessageCommandContext extends CommandContext {
	public prefix: string;
	public type: 'message' = 'message';

	public message: Message;
	public messageId: string;

	public constructor(manager: CommandManager, promptManager: PromptManager, command: Command, message: Message) {
		super(manager, promptManager, command);
		this.message = message;
		this.messageId = message.id;
	}

	public async prepare(): Promise<void> {
		const client = this.discord.client;
		this.self = client.user;
		this.selfId = client.user.id;

		this.channelId = this.message.channel.id;

		let channel = client.getChannel(this.channelId);
		if (!channel) channel = await client.getRESTChannel(this.channelId);
		if (!this.isTextableChannel(channel)) throw new Error('MessageCommandContext: Channel is not textable.');
		this.channel = channel;

		this.authorId = this.message.author.id;
		this.author = this.message.author;

		if ('guild' in this.channel) {
			const guild = this.channel.guild;

			this.guildId = guild.id;
			this.guild = guild;

			this.member = this.message.member;

			// selfMember
			const selfMember = guild.members.get(client.user.id);
			if (selfMember) this.selfMember = selfMember;
		}
	}

	public async getResponseId(): Promise<string> {
		return this.responseId;
	}

	public async acknowledge(): Promise<void> {
		if (this.responseId) return;
	}

	public async createResponse(response: MessageContent, files?: Array<FileContent>): Promise<unknown> {
		if (this.responseId) return this.editResponse(response, files);

		const message = await this.channel.createMessage(response, files);
		this.responseId = message.id;

		return message;
	}

	public async editResponse(response: MessageContent, files?: Array<FileContent>): Promise<unknown> {
		if (!this.responseId) return this.createResponse(response, files);

		if (typeof response === 'string') response = { content: response };

		const content: AdvancedMessageContentEdit = response;
		if (files) content.file = files;

		try {
			return await this.channel.editMessage(this.responseId, content);
		} catch (e) {
			// issue editing, create a new message
			const message = await this.channel.createMessage(content, files);
			this.responseId = message.id;

			return message;
		}
	}

	public async deleteResponse(): Promise<void> {
		if (!this.responseId) return;

		return this.channel.deleteMessage(this.responseId);
	}

	public async deleteExecutionMessage(): Promise<void> {
		try {
			await this.message.delete();
		} catch { /* NO-OP */ }
	}

	public async createMessage(content: MessageContent, files?: Array<FileContent>): Promise<unknown> {
		return this.channel.createMessage(content, files);
	}

	public async editMessage(messageId: string, content: MessageContent, files?: Array<FileContent>): Promise<unknown> {
		if (typeof content === 'string') content = { content };

		const edit: AdvancedMessageContentEdit = content;
		if (files) edit.file = files;

		return this.channel.editMessage(messageId, edit);
	}

	public async deleteMessage(messageId: string): Promise<void> {
		return this.channel.deleteMessage(messageId);
	}
}
