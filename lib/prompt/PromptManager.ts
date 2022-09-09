import { Component, ComponentAPI, Subscribe } from '@ayanaware/bento';
import { Logger } from '@ayanaware/logger-api';

import { Message } from 'eris';

import { Discord } from '../discord/Discord';
import { DiscordEvent } from '../discord/constants/DiscordEvent';
import { PossiblyTranslatable, Translatable } from '../interfaces/Translatable';

export type PromptHandler = (response: string, message?: Message) => Promise<unknown>;
type CloseHandler = (reason?: PossiblyTranslatable) => Promise<void>;

const log = Logger.get();
export class PromptManager implements Component {
	public name = '@ayanaware/bentocord:PromptManager';
	public api!: ComponentAPI;

	private readonly prompts: Map<string, [PromptHandler, CloseHandler]> = new Map();

	public async onUnload(): Promise<void> {
		// close all prompts onUnload
		for (const [key, [, close]] of this.prompts) {
			if (!close) continue;

			try {
				await close({ key: 'BENTOCORD_PROMPTMANAGER_UNLOAD', backup: 'The manager is unloading.' });
			} catch { /* NO-OP */ }

			this.prompts.delete(key);
		}
	}

	public hasPrompt(channelId: string, userId: string): boolean {
		const key = `${channelId}.${userId}`;
		return this.prompts.has(key);
	}

	public async addPrompt(channelId: string, userId: string, handler: PromptHandler, close?: CloseHandler): Promise<void> {
		const key = `${channelId}.${userId}`;
		if (!close) close = async () => { /* NO-OP */ };

		// close any other open prompts
		await this.closePrompt(channelId, userId, {
			key: 'BENTOCORD_PROMPT_CANCELED_NEW', backup: 'New prompt was opened.' });

		this.prompts.set(key, [handler, close]);
	}

	public async removePrompt(channelId: string, userId: string): Promise<void> {
		const key = `${channelId}.${userId}`;
		this.prompts.delete(key);
	}

	public async closePrompt(channelId: string, userId: string, reason?: PossiblyTranslatable): Promise<void> {
		const key = `${channelId}.${userId}`;

		const [, close] = this.prompts.get(key) ?? [];
		if (!close) return;

		try {
			await close(reason);
		} catch { /* NO-OP */}

		this.prompts.delete(key);
	}

	public async handleResponse(channelId: string, userId: string, response: string, message?: Message): Promise<void> {
		const key = `${channelId}.${userId}`;

		const [promptHandler] = this.prompts.get(key) ?? [];
		if (!promptHandler) return;

		try {
			await promptHandler(response, message);
		} catch (e) {
			log.error(`Prompt Handler Error: ${e}`);
		}
	}

	@Subscribe(Discord, DiscordEvent.MESSAGE_CREATE)
	private async handleMessage(message: Message) {
		return this.handleResponse(message.channel.id, message.author.id, message.content, message);
	}
}
