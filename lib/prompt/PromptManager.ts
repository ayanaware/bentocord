import { Component, ComponentAPI, Subscribe } from '@ayanaware/bento';

import { Emoji, Member, Message } from 'eris';

import { CommandContext, Discord, DiscordEvent } from '..';

import { Prompt } from './Prompt';

export class PromptManager implements Component {
	public name = '@ayanaware/bentocord:PromptManager';
	public api!: ComponentAPI;

	private readonly prompts: Map<string, Prompt>;

	public async createPrompt(ctx: CommandContext, content: string): Promise<any> {
		const prompt = new Prompt(ctx);

		return prompt.open(content);
	}

	public async createPagination(ctx: CommandContext, content: string): Promise<void> {

	}

	public async handleResponse(channelId: string, userId: string, response: string): Promise<void> {
		const key = `${channelId}.${userId}`;

		const prompt = this.prompts.get(key);
		if (!prompt) return;

		return prompt.handleResponse(response);
	}

	@Subscribe(Discord, DiscordEvent.MESSAGE_CREATE)
	private async handleMessage(message: Message) {
		return this.handleResponse(message.channel.id, message.author.id, message.content);
	}

	@Subscribe(Discord, DiscordEvent.MESSAGE_REACTION_ADD)
	private async handleReaction(message: Message, emoji: Emoji, reactor: Member) {
		const key = `${message.channel.id}.${reactor.id}`;
		const prompt = this.prompts.get(key);
		if (!prompt) return;

		return prompt.handleReaction(emoji);
	}
}
