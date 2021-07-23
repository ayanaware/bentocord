import { Component, ComponentAPI, Inject, PluginReference, Subscribe } from '@ayanaware/bento';
import { Client, ClientOptions } from 'eris';

import { Bentocord } from '../Bentocord';
import { BentocordVariable } from '../BentocordVariable';

import { DiscordEvent } from './constants';

import { Logger } from '@ayanaware/logger-api';
const log = Logger.get(null);

export class Discord implements Component {
	public name = 'Discord';
	public api!: ComponentAPI;
	public parent: PluginReference = Bentocord;

	public client: Client;

	@Inject() private bentocord: Bentocord;

	public async onLoad() {
		return this.connect();
	}

	public async onUnload() {
		return this.disconnect();
	}

	public async connect(tokenOverride?: string, optionsOverride?: ClientOptions) {
		const token = tokenOverride || this.api.getVariable({ name: BentocordVariable.BENTOCORD_TOKEN, default: null });
		if (!token) {
			throw new Error(`Failed to find token: Variable "${BentocordVariable.BENTOCORD_TOKEN}" and param tokenOverride empty`);
		}

		if (this.client) await this.disconnect();

		// merge options & overrides
		const clientOptions = {...this.bentocord.clientOptions, ...optionsOverride};
		clientOptions.autoreconnect = true;

		this.client = new Client(token, clientOptions);
		this.api.forwardEvents(this.client, Object.values(DiscordEvent));

		return this.client.connect();
	}

	public async disconnect() {
		this.client.disconnect({ reconnect: false });
		this.client.removeAllListeners();
	}

	@Subscribe(Discord, DiscordEvent.ERROR)
	private handleShardError(e: Error, id: number) {
		log.error(`Shard "${id}": ${e}`);
	}

	@Subscribe(Discord, DiscordEvent.SHARD_READY)
	private handleShardReady(id: number) {
		log.info(`Shard "${id}" ready`);
	}

	@Subscribe(Discord, DiscordEvent.SHARD_RESUME)
	private handleShardResume(id: number) {
		log.info(`Shard "${id}" resume`);
	}

	@Subscribe(Discord, DiscordEvent.SHARD_DISCONNECT)
	private handleShardDisconnect(e: Error, id: number) {
		let message = `Shard "${id}" disconnect`;
		if (e) message = `${message}, ${e}`;

		log.info(message);
	}
}