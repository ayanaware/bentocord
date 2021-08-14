import { Component, ComponentAPI, Subscribe, Variable } from '@ayanaware/bento';
import { Logger } from '@ayanaware/logger-api';

import { Client, ClientOptions, Guild } from 'eris';

import { BentocordVariable } from '../BentocordVariable';

import { DiscordEvent } from './constants/DiscordEvent';

const log = Logger.get(null);

export class Discord implements Component {
	public name = '@ayanaware/bentocord:Discord';
	public api!: ComponentAPI;

	public client: Client;

	@Variable({ name: BentocordVariable.BENTOCORD_CLIENT_OPTIONS, default: {} })
	private readonly clientOptions: ClientOptions;

	public async onLoad(): Promise<void> {
		return this.connect();
	}

	public async onUnload(): Promise<void> {
		return this.disconnect();
	}

	public async connect(tokenOverride?: string, optionsOverride?: ClientOptions): Promise<void> {
		const token = tokenOverride || this.api.getVariable({ name: BentocordVariable.BENTOCORD_TOKEN, default: null });
		if (!token) {
			throw new Error(`Failed to find token: Variable "${BentocordVariable.BENTOCORD_TOKEN}" and param tokenOverride empty`);
		}

		if (this.client) await this.disconnect();

		// merge options & overrides
		const clientOptions = { ...this.clientOptions, ...optionsOverride };
		clientOptions.autoreconnect = true;

		this.client = new Client(token, clientOptions);
		this.api.forwardEvents(this.client, Object.values(DiscordEvent));

		return this.client.connect();
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async disconnect(): Promise<void> {
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
