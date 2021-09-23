import { Component, ComponentAPI, Subscribe } from '@ayanaware/bento';

import { Emoji, Member, Message } from 'eris';

import type { CommandContext } from '../commands/CommandContext';
import { Discord } from '../discord/Discord';
import { DiscordEvent } from '../discord/constants/DiscordEvent';
import { Translateable } from '../interfaces/Translateable';

import { PromptValidate, Prompt } from './Prompt';
import { ChoicePrompt, PromptChoice } from './prompts/ChoicePrompt';
import { PaginationOptions, PaginationPrompt } from './prompts/PaginationPrompt';

export class PromptManager implements Component {
	public name = '@ayanaware/bentocord:PromptManager';
	public api!: ComponentAPI;

	private readonly prompts: Map<string, Prompt<any>>;

	private getKey(ctx: CommandContext) {
		return `${ctx.channelId}.${ctx.authorId}`;
	}

	private async closePrompt(ctx: CommandContext) {
		const key = this.getKey(ctx);

		const prompt = this.prompts.get(key);
		if (!prompt) return;

		const reason = await ctx.formatTranslation('BENTOCORD_PROMPT_CANCELED_NEW') || 'New prompt was opened.';
		await prompt.close(reason);

		this.prompts.delete(reason);
	}

	public async createPrompt<T>(ctx: CommandContext, content: string | Translateable, validate?: PromptValidate<T>): Promise<T> {
		await this.closePrompt(ctx);

		const key = this.getKey(ctx);
		const prompt = new Prompt<T>(ctx, validate);
		this.prompts.set(key, prompt);

		const result = await prompt.open(content);
		this.prompts.delete(key);

		return result;
	}

	public async createPagination(ctx: CommandContext, items: Array<string | Translateable>, content?: string | Translateable, options?: PaginationOptions): Promise<void> {
		await this.closePrompt(ctx);

		const key = this.getKey(ctx);
		const prompt = new PaginationPrompt(ctx, items, options);
		this.prompts.set(key, prompt);

		const result = await prompt.open(content);

		this.prompts.delete(key);

		return result;
	}

	public async createChoicePrompt<T>(ctx: CommandContext, choices: Array<PromptChoice<T>>, content?: string | Translateable, options?: PaginationOptions): Promise<T> {
		await this.closePrompt(ctx);

		const key = this.getKey(ctx);
		const prompt = new ChoicePrompt<T>(ctx, choices, options);
		this.prompts.set(key, prompt);

		const result = await prompt.open(content);
		this.prompts.delete(key);

		return result;
	}

	public async handleResponse(channelId: string, userId: string, response: string, message?: Message): Promise<void> {
		const key = `${channelId}.${userId}`;

		const prompt = this.prompts.get(key);
		if (!prompt) return;

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
		if (message.id !== prompt.ctx.responseId) return;

		return prompt.handleReaction(message, emoji);
	}
}
