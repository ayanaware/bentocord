import { Component, ComponentAPI, Inject, PluginReference } from '@ayanaware/bento';
import { Client, MessageContent } from 'eris';
import { DiscordEvent } from '../../constants';

import { Logger } from '@ayanaware/logger-api';
import { Bentocord } from '../../Bentocord';
const log = Logger.get();

export class Discord implements Component {
	public name = 'Discord';
	public api!: ComponentAPI;
	public parent: PluginReference = Bentocord;

	public client: Client;

	@Inject(Bentocord)
	private bentocord: Bentocord;

	public async onLoad() {
		return this.connect();
	}

	public async connect(tokenOverride?: string) {
		const token = tokenOverride || this.api.getVariable({ name: this.bentocord.tokenKey, default: null });
		if (!token) throw new Error(`Failed to find token: Variable "${this.bentocord.tokenKey}" and param tokenOverride empty`);

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
}