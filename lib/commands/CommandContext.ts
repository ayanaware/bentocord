import { EntityAPI } from '@ayanaware/bento';

import {
	AllowedMentions,
	BaseData,
	CommandInteraction,
	EmbedOptions,
	Guild,
	GuildTextableChannel,
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

	/**
	 * Check if command author is a owner
	 */
	public async isOwner(): Promise<boolean> {
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
}

export class InteractionCommandContext extends CommandContext {
	public type: 'interaction' = 'interaction';
	public interaction: CommandInteraction;

	public channel?: GuildTextableChannel;

	public constructor(manager: CommandManager, promptManager: PromptManager, command: Command, interaction: CommandInteraction) {
		super(manager, promptManager, command);
		this.interaction = interaction;

		const client = this.discord.client;

		this.channelId = interaction.channel.id;

		if (interaction.guildID) {
			this.authorId = interaction.member.user.id;
			this.author = new User(interaction.member.user as unknown as BaseData, client);

			this.guildId = interaction.guildID;

			const guild = client.guilds.get(interaction.guildID);
			if (guild) this.guild = guild;

			const member = guild.members.get(this.authorId);
			if (member) this.member = member;

			const channel = guild.channels.get(interaction.guildID) as GuildTextableChannel;
			if (channel) this.channel = channel;
		} else {
			this.authorId = interaction.user.id;
			this.author = new User(interaction.user as unknown as BaseData, client);

			this.channel = client.getChannel(interaction.guildID) as TextChannel;
		}
	}

	public async acknowledge(): Promise<void> {
		if (this.interaction.acknowledged) return;

		await this.interaction.acknowledge();

		const message = await this.interaction.getOriginalMessage();
		this.responseId = message.id;
	}

	public async createResponse(response: string | ResponseContent): Promise<unknown> {
		if (this.interaction.acknowledged) return this.editResponse(response);

		if (typeof response === 'string') response = { content: response };

		await this.interaction.createMessage(response);

		const message = await this.interaction.getOriginalMessage();
		this.responseId = message.id;
	}

	public async editResponse(response: string | ResponseContent): Promise<unknown> {
		if (!this.interaction.acknowledged) return this.createResponse(response);

		if (typeof response === 'string') response = { content: response };

		return this.interaction.editOriginalMessage(response);
	}

	public async deleteResponse(): Promise<void> {
		if (!this.interaction.acknowledged) return;

		return this.interaction.deleteOriginalMessage();
	}
}

export class MessageCommandContext extends CommandContext {
	public prefix: string;
	public type: 'message' = 'message';

	public message: Message;

	public constructor(manager: CommandManager, promptManager: PromptManager, command: Command, message: Message) {
		super(manager, promptManager, command);

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
}
