import { EntityAPI } from '@ayanaware/bento';

import {
	AdvancedMessageContentEdit,
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
import { AgnosticMessageContent } from '../interfaces/AgnosticMessageContent';
import { PossiblyTranslatable, Translatable } from '../interfaces/Translatable';
import { PaginationPrompt } from '../prompt/PaginationPrompt';
import { Prompt, PromptOptions, PromptValidator } from '../prompt/Prompt';
import { AnyPaginator } from '../prompt/helpers/AnyPaginator';
import { CodeblockPaginator, CodeblockPaginatorItems } from '../prompt/helpers/CodeblockPaginator';
import { ChoicePrompt, ChoicePromptChoice } from '../prompt/prompts/ChoicePrompt';
import { ConfirmPrompt } from '../prompt/prompts/ConfirmPrompt';
import { IsTextableChannel } from '../util/IsTextableChannel';

export class BaseContext<C extends MessageContent = MessageContent> {
	public readonly api: EntityAPI;

	public channel: TextableChannel;
	public get channelId(): string {
		return this.channel.id;
	}

	public user: User;
	public get userId(): string {
		return this.user?.id;
	}

	/** Member object if available */
	public member?: Member;

	/** @deprecated Use .user instead */
	public get author(): User {
		return this.user;
	}

	/** @deprecated Use .userId instead */
	public get authorId(): string {
		return this.userId;
	}

	public guild?: Guild;
	public get guildId(): string {
		return this.guild?.id;
	}

	/** Bot's user object */
	public self: ExtendedUser;
	public get selfId(): string {
		return this.self?.id;
	}

	/** Bot's member object if available */
	public selfMember?: Member;

	public readonly interface: BentocordInterface;
	public readonly discord: Discord;

	public responseId?: string;
	protected responseMessage?: Message;

	/** .prepare() must be called before this object is ready to be used */
	public constructor(api: EntityAPI, channel: TextableChannel, user: User) {
		this.api = api;

		this.interface = this.api.getEntity(BentocordInterface);
		this.discord = this.api.getEntity(Discord);

		// set the properties we can
		this.channel = channel;
		this.user = user;

		this.self = this.discord.client.user;
	}

	/**
	 * Finishes preparing the context, handling async operations.
	 */
	public async prepare(): Promise<void> {
		const client = this.discord.client;

		// get channel
		let channel = client.getChannel(this.channelId);
		if (!channel) channel = await client.getRESTChannel(this.channelId);
		if (!IsTextableChannel(channel)) throw new Error('BaseContext: Channel is not textable');
		this.channel = channel;

		if ('guild' in this.channel) {
			const guild = this.channel.guild;
			this.guild = guild;

			this.member = guild.members.get(this.userId);
			this.selfMember = guild.members.get(this.selfId);
		}
	}

	/**
	 * Check if command author is a owner
	 */
	public async isBotOwner(): Promise<boolean> {
		return this.interface.isOwner(this.userId);
	}

	/**
	 * Format a number based on who/where ran
	 * @param num Number
	 * @returns
	 */
	public async formatNumber(num: number): Promise<string> {
		return this.interface.formatNumber(num, {
			userId: this.userId || null,
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
			userId: this.userId || null,
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
	public async formatTranslation(key: string, repl?: Record<string, unknown>, backup?: string): Promise<string>;
	public async formatTranslation(translatable: Translatable): Promise<string>;
	public async formatTranslation(key: string | Translatable, repl?: Record<string, unknown>, backup?: string): Promise<string> {
		// unpack translatable
		if (typeof key === 'object') {
			repl = key.repl;
			backup = key.backup;
			key = key.key;
		}

		return this.interface.formatTranslation(key, repl, {
			userId: this.userId || null,
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

		return channel.permissionsOf(this.userId).has(permission) || false;
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
	 * Prompt command invoker for additional input
	 * @param content Message to display
	 * @param validator Validate their input
	 * @param options PromptOptions
	 * @returns Validated input
	 */
	public async prompt<T = string>(content: PossiblyTranslatable | AgnosticMessageContent, validator?: PromptValidator<T>, options?: PromptOptions): Promise<T> {
		const prompt = new Prompt<T>(this, validator, options);
		if (typeof content === 'object' && 'key' in content) await prompt.contentTranslated(content.key, content.repl, content.backup);
		else prompt.content(content);

		return prompt.start();
	}

	/**
	 * Prompt command author for extra confirmation
	 * @param content details about what they are confirming
	 * @returns boolean
	 */
	public async confirm(content?: PossiblyTranslatable | AgnosticMessageContent, items?: AnyPaginator<void> | CodeblockPaginatorItems<void>): Promise<boolean> {
		if (Array.isArray(items) || typeof items === 'function') items = new CodeblockPaginator(this, items);

		const confirm = new ConfirmPrompt(this, items);
		if (!content) content = await this.formatTranslation('BENTOCORD_PROMPT_CONFIRM', {}, 'Please confirm you wish to continue');

		if (typeof content === 'object' && 'key' in content) await confirm.contentTranslated(content.key, content.repl, content.backup);
		else if (content) confirm.content(content);

		return confirm.start();
	}

	/**
	 * Show a pagination UI
	 * @param items Array of items
	 * @param content details about what they are seeing
	 * @param options PaginationOptions
	 * @returns
	 */
	public async pagination(items: AnyPaginator<void> | CodeblockPaginatorItems<void>, content?: PossiblyTranslatable | AgnosticMessageContent, options?: PromptOptions): Promise<void> {
		if (Array.isArray(items) || typeof items === 'function') items = new CodeblockPaginator(this, items);
		const pagination = new PaginationPrompt(this, items, options);

		if (typeof content === 'object' && 'key' in content) await pagination.contentTranslated(content.key, content.repl, content.backup);
		else if (content) pagination.content(content);

		return pagination.start();
	}

	/**
	 * Prompt command author to select a choice
	 * @param choices Array of PromptChoice
	 * @param content details about what they are choosing
	 * @param options PagiantionOptions
	 * @returns Selected PromptChoice value
	 */
	public async choice<T = string>(choices: AnyPaginator<T> | CodeblockPaginatorItems<T>, content?: PossiblyTranslatable | AgnosticMessageContent, options?: PromptOptions): Promise<T> {
		if (Array.isArray(choices) || typeof choices === 'function') choices = new CodeblockPaginator(this, choices);
		const choice = new ChoicePrompt(this, choices, options);

		if (typeof content === 'object' && 'key' in content) await choice.contentTranslated(content.key, content.repl, content.backup);
		else if (content) choice.content(content);

		return choice.start();
	}

	public async getResponse(): Promise<Message> {
		// use cached instance if we have one
		if (this.responseMessage && this.responseMessage.id === this.responseId) return this.responseMessage;

		const message = await this.discord.client.getMessage(this.channelId, this.responseId);
		this.responseMessage = message;

		return message;
	}

	public async createResponse(response: C, files?: Array<FileContent>): Promise<void> {
		if (this.responseId) return this.editResponse(response, files);

		const message = await this.channel.createMessage(response, files);
		this.responseId = message.id;
		this.responseMessage = message;
	}

	public async editResponse(response: C, files?: Array<FileContent>): Promise<void> {
		if (!this.responseId) return this.createResponse(response, files);

		const edit: AdvancedMessageContentEdit = typeof response === 'string' ? { content: response } : response;
		if (files) edit.file = files;

		try {
			await this.channel.editMessage(this.responseId, edit);
		} catch (e) {
			// issue editing, create a new message
			const message = await this.channel.createMessage(edit, files);
			this.responseId = message.id;
			this.responseMessage = message;
		}
	}

	public async deleteResponse(): Promise<void> {
		if (!this.responseId) return;
		await this.channel.deleteMessage(this.responseId);

		this.responseId = null;
		this.responseMessage = null;
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
		return this.createResponse({ content } as C);
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
		return this.editResponse({ content } as C);
	}

	public async createMessage(content: C, files?: Array<FileContent>): Promise<Message> {
		return this.channel.createMessage(content, files);
	}

	public async editMessage(messageId: string, content: C, files?: Array<FileContent>): Promise<Message> {
		const edit: AdvancedMessageContentEdit = typeof content === 'string' ? { content } : content;
		if (files) edit.file = files;

		return this.channel.editMessage(messageId, edit);
	}

	public async deleteMessage(messageId: string): Promise<void> {
		return this.channel.deleteMessage(messageId);
	}

	public async createTranslatedMessage(key: string, repl?: Record<string, unknown>, backup?: string): Promise<Message> {
		const content = await this.formatTranslation(key, repl, backup);
		return this.createMessage({ content } as C);
	}

	public async editTranslatedMessage(messageId: string, key: string, repl?: Record<string, unknown>, backup?: string): Promise<Message> {
		const content = await this.formatTranslation(key, repl, backup);
		return this.editMessage(messageId, { content } as C);
	}
}
