import { Component, ComponentAPI, Subscribe } from '@ayanaware/bento';

import { Emoji, Member, Message } from 'eris';

import type { AnyCommandContext } from '../commands/CommandContext';
import { Discord } from '../discord/Discord';
import { DiscordEvent } from '../discord/constants/DiscordEvent';
import { Translateable } from '../interfaces/Translateable';

import { PromptValidate, Prompt } from './Prompt';
import { ChoicePrompt, PromptChoice } from './prompts/ChoicePrompt';
import { ConfirmPrompt } from './prompts/ConfirmPrompt';
import { PaginationOptions, PaginationPrompt } from './prompts/PaginationPrompt';

export class PromptManager implements Component {
	public name = '@ayanaware/bentocord:PromptManager';
	public api!: ComponentAPI;

	private readonly prompts: Map<string, Prompt<any>> = new Map();

	public async onUnload(): Promise<void> {
		// close all prompts onUnload
		for (const prompt of this.prompts.values()) {
			try {
				const reason = await prompt.ctx.formatTranslation('BENTOCORD_PROMPTMANAGER_UNLOAD', {}, 'The manager is unloading.');
				await prompt.close(reason);
			} catch { /* Failed */ }
		}
	}

	private getKey(ctx: AnyCommandContext) {
		return `${ctx.channelId}.${ctx.authorId}`;
	}

	public async closePrompt(ctx: AnyCommandContext): Promise<void> {
		const key = this.getKey(ctx);

		const prompt = this.prompts.get(key);
		if (!prompt) return;

		if (prompt.pending) {
			const reason = await ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED_NEW', {}, 'New prompt was opened.');
			try {
				await prompt.close(reason);
			} catch { /* NO-OP */}
		}

		this.prompts.delete(key);
	}

	public async createPrompt<T>(ctx: AnyCommandContext, content: string | Translateable, validate?: PromptValidate<T>): Promise<T> {
		await this.closePrompt(ctx);

		const key = this.getKey(ctx);
		const prompt = new Prompt<T>(ctx, validate);
		this.prompts.set(key, prompt);

		const result = await prompt.open(content);
		this.prompts.delete(key);

		return result;
	}

	public async createPagination(ctx: AnyCommandContext, items: Array<string | Translateable>, content?: string | Translateable, options?: PaginationOptions): Promise<void> {
		await this.closePrompt(ctx);

		const key = this.getKey(ctx);
		const prompt = new PaginationPrompt(ctx, items, options);
		this.prompts.set(key, prompt);

		const result = await prompt.open(content);
		this.prompts.delete(key);

		return result;
	}

	public async createChoicePrompt<T>(ctx: AnyCommandContext, choices: Array<PromptChoice<T>>, content?: string | Translateable, options?: PaginationOptions): Promise<T> {
		await this.closePrompt(ctx);

		const key = this.getKey(ctx);
		const prompt = new ChoicePrompt<T>(ctx, choices, options);
		this.prompts.set(key, prompt);

		const result = await prompt.open(content);
		this.prompts.delete(key);

		return result;
	}

	public async createConfirmPrompt(ctx: AnyCommandContext, content?: string | Translateable, items?: Array<string | Translateable>, options?: PaginationOptions): Promise<boolean> {
		await this.closePrompt(ctx);

		const key = this.getKey(ctx);
		const prompt = new ConfirmPrompt(ctx, items, options);
		this.prompts.set(key, prompt);

		const result = await prompt.open(content);
		this.prompts.delete(key);

		return result;
	}

	public async handleResponse(channelId: string, userId: string, response: string, message?: Message): Promise<void> {
		const key = `${channelId}.${userId}`;

		const prompt = this.prompts.get(key);
		if (!prompt) return;

		if (!prompt.pending) {
			this.prompts.delete(key);
			return;
		}

		return prompt.handleResponse(response, message);
	}

	@Subscribe(Discord, DiscordEvent.MESSAGE_CREATE)
	private async handleMessage(message: Message) {
		return this.handleResponse(message.channel.id, message.author.id, message.content, message);
	}

	@Subscribe(Discord, DiscordEvent.MESSAGE_REACTION_ADD)
	private async handleReaction(message: Message, emoji: Emoji, reactor: Member) {
		const key = `${message.channel.id}.${reactor.id}`;
		const prompt = this.prompts.get(key);
		if (!prompt) return;

		const responseId = await prompt.ctx.getResponseId();
		if (message.id !== responseId) return;

		return prompt.handleReaction(message, emoji);
	}
}
