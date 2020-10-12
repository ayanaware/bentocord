import { Component, ComponentAPI, Inject, PluginReference, Subscribe } from '@ayanaware/bento';
import { Client } from 'eris';

import { Bentocord } from '../../Bentocord';
import { BentocordVariable, DiscordEvent } from '../../constants';

import { Logger } from '@ayanaware/logger-api';
const log = Logger.get(null);

export class Discord implements Component {
	public name = 'Discord';
	public api!: ComponentAPI;
	public parent: PluginReference = Bentocord;

	public client: Client;

	public async onLoad() {
		return this.connect();
	}

	public async connect(tokenOverride?: string) {
		const token = tokenOverride || this.api.getVariable({ name: BentocordVariable.BENTOCORD_TOKEN, default: null });
		if (!token) {
			throw new Error(`Failed to find token: Variable "${BentocordVariable.BENTOCORD_TOKEN}" and param tokenOverride empty`);
		}

		if (this.client) await this.disconnect();

		this.client = new Client(token);
		this.client.on('error', e => {
			log.error(`Client Error: ${e}`);
		});

		this.api.forwardEvents(this.client, Object.values(DiscordEvent));

		return this.client.connect();
	}

	public async disconnect() {
		this.client.disconnect({ reconnect: false });
		this.client.removeAllListeners();
	}

	@Subscribe(Discord, DiscordEvent.SHARD_READY)
	private handleShardReady(id: number) {
		log.info(`Shard "${id}" ready`);
	}

	@Subscribe(Discord, DiscordEvent.SHARD_RESUME)
	private handleShardResume(id: number) {
		log.info(`Shard "${id}" resume`);
	}

	@Subscribe(Discord, DiscordEvent.SHARD_RESUME)
	private handleShardDisconnect(e: Error, id: number) {
		let message = `Shard "${id}" disconnect`;
		if (e) message = `${message}, ${e}`;

		log.info(message);
	}
}