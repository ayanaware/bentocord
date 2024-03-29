import { Component, ComponentAPI, Inject, Subscribe } from '@ayanaware/bento';
import { Discord, DiscordEvent } from '@ayanaware/bentocord';
import { Logger } from '@ayanaware/logger';

import { Message } from 'eris';
const log = Logger.get();

export class Basic implements Component {
	public name = 'Basic';
	public api!: ComponentAPI;

	@Inject(Discord) private readonly discord: Discord;

	@Subscribe(Discord, DiscordEvent.SHARD_READY)
	private onShardReady(id: number) {
		log.info(`Shard "${id}" ready`);
	}

	@Subscribe(Discord, DiscordEvent.SHARD_DISCONNECT)
	private onShardDisconnect(e: Error, id: number) {
		log.info(`Shard "${id}" disconnect`);
	}

	@Subscribe(Discord, DiscordEvent.MESSAGE_CREATE)
	private async onMessageCreate(message: Message) {
		log.info(`${message.author.username}#${message.author.discriminator}: ${message.content}`);
	}

	@Subscribe(Discord, DiscordEvent.MESSAGE_UPDATE)
	private async onMessageUpdate(message: Message) {
		log.info(`${message.author.username}#${message.author.discriminator}: ${message.content}`);
	}
}
