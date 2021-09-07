import { Component, ComponentAPI, Inject, Subscribe } from '@ayanaware/bento';
import { Logger } from '@ayanaware/logger-api';

import { Client, ClientOptions, OAuthApplicationInfo } from 'eris';

import { BentocordInterface } from '../BentocordInterface';
import { BentocordVariable } from '../BentocordVariable';

import { DiscordEvent } from './constants/DiscordEvent';

const log = Logger.get(null);

export class Discord implements Component {
	public name = '@ayanaware/bentocord:Discord';
	public api!: ComponentAPI;

	public client: Client;
	private clientOptions: ClientOptions;

	public application: OAuthApplicationInfo;

	@Inject() private readonly interface: BentocordInterface;

	public async onUnload(): Promise<void> {
		return this.disconnect();
	}

	public async onVerify(): Promise<void> {
		return this.connect();
	}

	public async connect(tokenOverride?: string, optionsOverride?: ClientOptions): Promise<void> {
		const token = tokenOverride || this.api.getVariable({ name: BentocordVariable.BENTOCORD_TOKEN, default: null });
		if (!token) {
			throw new Error(`Failed to find token: Variable "${BentocordVariable.BENTOCORD_TOKEN}" and param tokenOverride empty`);
		}

		if (this.client) await this.disconnect();

		let clientOptions = this.api.getVariable<ClientOptions>({ name: BentocordVariable.BENTOCORD_CLIENT_OPTIONS, default: {} });

		let { shardIds, shardCount } = await this.interface.getShardData();
		clientOptions.maxShards = shardCount || 1;

		// resolve firstShardID & lastShardID
		if (!Array.isArray(shardIds) || shardIds.length === 0) shardIds = [0, 1];
		shardIds.sort((a, b) => a - b); // just in case, for that special person

		if (shardIds.length < 2) clientOptions = { ...clientOptions, firstShardID: shardIds[0], lastShardID: shardIds[0] + 1 };
		else clientOptions = { ...clientOptions, firstShardID: shardIds[0], lastShardID: shardIds[shardIds.length - 1] };

		// merge options & overrides
		clientOptions = { ...clientOptions, ...optionsOverride };
		clientOptions.autoreconnect = true;

		this.clientOptions = clientOptions;
		log.info(`ClientOptions = ${JSON.stringify(clientOptions)}`);

		this.client = new Client(`Bot ${token}`, clientOptions);
		this.api.forwardEvents(this.client, Object.values(DiscordEvent));

		// refresh application object
		// https://discord.com/developers/docs/resources/application#application-object
		this.application = await this.client.getOAuthApplication();
		log.info(`Discord Application: ${this.application.name} (${this.application.id}).`);

		await this.client.connect();
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
