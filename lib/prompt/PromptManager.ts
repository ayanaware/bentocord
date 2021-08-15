import { Component, ComponentAPI, Inject, Subscribe } from '@ayanaware/bento';
import Logger from '@ayanaware/logger-api';

import { Message, MessageContent } from 'eris';

import { Discord } from '../discord/Discord';
import { Messenger } from '../discord/abstractions/Messenger';
import { DiscordEvent } from '../discord/constants/DiscordEvent';

import { PromptRejectType } from './constants/PromptRejectType';
import { Prompt } from './interfaces/Prompt';
import { PromptOptions } from './interfaces/PromptOptions';

const log = Logger.get();

export class PromptManager implements Component {
	public name = '@ayanaware/bentocord:PromptManager';
	public api!: ComponentAPI;

	private readonly prompts: Map<string, Prompt> = new Map();

	@Inject() private readonly discord: Discord;

	private getPromptKey(channelId: string, userId: string) {
		return `${channelId}.${userId}`;
	}

	private cleanupPrompt(prompt: Prompt) {
		const key = this.getPromptKey(prompt.channelId, prompt.userId);
		this.prompts.delete(key);

		// clear pending timeouts
		if (prompt.timeout) clearTimeout(prompt.timeout);
	}

	private async cleanupMessages(prompt: Prompt) {
		const channelId = prompt.channelId;
		const messageIds = prompt.messageIds;

		for (const messageId of messageIds) {
			try {
				await this.discord.client.deleteMessage(channelId, messageId);
			} catch (e) {
				log.warn(`cleanupMessages(): Failed to delete message: "${messageId}"`);
				continue;
			}
		}
	}

	public async createPrompt(channelId: string, userId: string, content: MessageContent, options: PromptOptions = {}, time = 30 * 1000): Promise<any> {
		const messenger = new Messenger(this.discord, channelId);
		const message = await messenger.createMessage(content);

		const key = this.getPromptKey(channelId, userId);
		if (this.prompts.has(key)) await this.cancelPrompt(channelId, userId);

		return new Promise((resolve, reject) => {
			const prompt: Prompt = {
				channelId, userId,
				messageIds: [message.id],
				options,
				resolve, reject,
				refresh: () => {
					if (prompt.timeout) clearTimeout(prompt.timeout);

					prompt.timeout = setTimeout(() => {
						this.cleanupPrompt(prompt);
						reject(PromptRejectType.TIMEOUT);

						this.cleanupMessages(prompt).catch(e => log.warn(`cleanupPrompt(): Failed to cleanup: ${e}`));
					}, time);
				},
			};
			prompt.refresh();

			this.prompts.set(key, prompt);
		});
	}

	public async cancelPrompt(channelId: string, userId: string): Promise<void> {
		const key = this.getPromptKey(channelId, userId);
		const prompt = this.prompts.get(key);
		if (!prompt) return;

		this.cleanupPrompt(prompt);

		prompt.reject(PromptRejectType.CANCEL);

		return this.cleanupMessages(prompt);
	}

	@Subscribe(Discord, DiscordEvent.MESSAGE_CREATE)
	private async handleMessageCreate(message: Message) {
		const channelId = message.channel.id;
		const userId = message.author.id;

		const key = this.getPromptKey(channelId, userId);
		const prompt = this.prompts.get(key);
		if (!prompt) return;

		const content = message.content;
		const options = prompt.options || {};

		// no validate resolve
		if (typeof options.validate !== 'function') {
			this.cleanupPrompt(prompt);
			prompt.resolve(content);

			return this.cleanupMessages(prompt);
		}

		// validate resolve

		let result;
		try {
			result = await options.validate(content);
		} catch (e) {
			this.cleanupPrompt(prompt);
			prompt.reject(e);

			return this.cleanupMessages(prompt);
		}

		if (result === null) {
			// attempt limit
			prompt.attempt = (prompt.attempt || 0) + 1;
			if (prompt.attempt >= (options.retries || 3)) {
				this.cleanupPrompt(prompt);
				prompt.reject(PromptRejectType.RETRY_LIMIT);

				return this.cleanupMessages(prompt);
			}

			prompt.refresh();

			// validate message
			const text = options.retryText ? options.retryText : 'Failed to validate, please try again.';
			const sentMessage = await (new Messenger(this.discord, channelId)).createMessage(text);
			prompt.messageIds.push(sentMessage.id);

			return;
		}

		this.cleanupPrompt(prompt);
		prompt.resolve(result);

		return this.cleanupMessages(prompt);
	}

	// COMMON USE PROMPTS
	public async createConfirmPrompt(channelId: string, userId: string, content?: MessageContent, time?: number): Promise<any> {
		try {
			return this.createPrompt(channelId, userId, content || 'Please confirm this action [yes/no]:', {
				validate(c) {
					if (/^(true|yes|y|1)$/i.exec(c)) return true;
					if (/^(false|no|n|0)$/i.exec(c)) return false;

					return false;
				},
			}, time);
		} catch (e) {
			return false;
		}
	}
}
