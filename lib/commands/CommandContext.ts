import { EntityAPI } from '@ayanaware/bento';

import {
	AllowedMentions,
	AnyChannel,
	CommandInteraction,
	Constants,
	EmbedOptions,
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

export type AnyCommandContext = MessageCommandContext | InteractionCommandContext;

export interface ResponseContent {
	content?: string;
	embeds?: Array<EmbedOptions>;

	allowedMentions?: AllowedMentions;
}

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

	public message?: Message;

	public readonly interface: BentocordInterface;
	public readonly discord: Discord;

	public readonly manager: CommandManager;
	public readonly promptManager: PromptManager;

	public responseId: string;

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
	 * @param key Translation key
	 * @param repl Translation replacements
	 * @returns Formatted translation or null
	 */
	public async formatTranslation(key: string, repl?: Record<string, unknown>): Promise<string> {
		return this.interface.formatTranslation(key, repl, {
			userId: this.authorId || null,
			channelId: this.channelId || null,
			guildId: this.guildId || null,
		});
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
		const selfId = this.discord.client.user.id;
		if (!selfId) return;

		return channel.permissionsOf(selfId).has(permission) || false;
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
		if (!content) content = await this.formatTranslation('BENTOCORD_PROMPT_CONFIRM') || 'Please confirm you wish to continue [y/n]:';
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
	 * @returns Message/Interaction
	 */
	public async createTranslatedResponse(key: string, repl?: Record<string, unknown>): Promise<unknown> {
		const content = await this.formatTranslation(key, repl);
		return this.createResponse({ content });
	}

	/**
	 * Edit translation response
	 * @param key Translation Key
	 * @param repl Replacements
	 * @returns Message/Interaction
	 */
	public async editTranslatedResponse(key: string, repl?: Record<string, unknown>): Promise<unknown> {
		const content = await this.formatTranslation(key, repl);
		return this.editResponse({ content });
	}

	public abstract acknowledge(): Promise<void>;

	public abstract createResponse(response: string | ResponseContent): Promise<unknown>;
	public abstract editResponse(response: string | ResponseContent): Promise<unknown>;
	public abstract deleteResponse(): Promise<void>;

	public abstract deleteExecutionMessage(): Promise<void>;
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

		this.channelId = this.interaction.channel.id;

		let channel = client.getChannel(this.channelId);
		if (!channel) channel = await client.getRESTChannel(this.channelId);
		if (!this.isTextableChannel(channel)) throw new Error('InteractionCommandContext: Channel is not textable.');
		this.channel = channel;

		if (this.interaction.guildID) {
			this.authorId = this.interaction.member.user.id;
			this.author = this.interaction.member.user;

			this.guildId = this.interaction.guildID;

			const guild = client.guilds.get(this.interaction.guildID);
			if (!guild) throw new Error('InteractionCommandContext: Guild not found');
			this.guild = guild;

			const member = guild.members.get(this.authorId);
			if (member) this.member = member;
		} else {
			this.authorId = this.interaction.user.id;
			this.author = this.interaction.user;
		}
	}

	public async acknowledge(): Promise<void> {
		if (this.interaction.acknowledged) return;

		await this.interaction.acknowledge();

		const message = await this.interaction.getOriginalMessage();
		this.message = message;
		this.responseId = message.id;
	}

	public async createResponse(response: string | ResponseContent): Promise<unknown> {
		if (this.interaction.acknowledged) return this.editResponse(response);

		if (typeof response === 'string') response = { content: response };

		await this.interaction.createMessage(response);

		const message = await this.interaction.getOriginalMessage();
		this.message = message;
		this.responseId = message.id;
	}

	public async editResponse(response: string | ResponseContent): Promise<unknown> {
		if (!this.interaction.acknowledged) return this.createResponse(response);

		if (typeof response === 'string') response = { content: response };

		if (!this.responseId) {
			// create a new message
			const msg = await this.interaction.createFollowup(response);
			this.responseId = msg.id;

			return msg;
		}

		return this.interaction.editMessage(this.responseId, response);
	}

	public async deleteResponse(): Promise<void> {
		if (!this.interaction.acknowledged) return;

		await this.interaction.deleteMessage(this.responseId);
		this.responseId = null;
	}

	public async deleteExecutionMessage(): Promise<void> {
		if (!this.interaction.acknowledged) await this.acknowledge();

		try {
			await this.interaction.deleteOriginalMessage();
			this.responseId = null;
		} catch { /* NO-OP */ }
	}
}

export class MessageCommandContext extends CommandContext {
	public prefix: string;
	public type: 'message' = 'message';

	public message: Message;

	public constructor(manager: CommandManager, promptManager: PromptManager, command: Command, message: Message) {
		super(manager, promptManager, command);
		this.message = message;
	}

	public async prepare(): Promise<void> {
		const client = this.discord.client;

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

			if (this.message.member) this.member = this.message.member;
		}
	}

	public async acknowledge(): Promise<void> {
		// NO-OP on Message Context
	}

	public async createResponse(response: string | ResponseContent): Promise<unknown> {
		if (this.responseId) return this.editResponse(response);

		if (typeof response === 'string') response = { content: response };

		const content: MessageContent = {
			content: response.content,
			embed: response.embeds ? response.embeds[0] : null,
			allowedMentions: response.allowedMentions,
		};

		const message = await this.channel.createMessage(content);
		this.responseId = message.id;

		return message;
	}

	public async editResponse(response: string | ResponseContent): Promise<unknown> {
		if (!this.responseId) return this.createResponse(response);

		if (typeof response === 'string') response = { content: response };

		const content: MessageContent = {
			content: response.content,
			embed: response.embeds ? response.embeds[0] : null,
			allowedMentions: response.allowedMentions,
		};

		return this.channel.editMessage(this.responseId, content);
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
}
