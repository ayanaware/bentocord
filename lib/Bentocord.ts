import { Entity, FSComponentLoader, Plugin, PluginAPI } from '@ayanaware/bento';
import { ClientOptions } from 'eris';

import { StorageLike } from './interfaces';
import { RamStorage } from './util';

import { Logger } from '@ayanaware/logger-api';
const log = Logger.get();

export class Bentocord implements Plugin {
	public name = 'Bentocord';
	public version: string;

	public api!: PluginAPI;

	public tokenKey: string;
	public clientOptions: ClientOptions;

	public storage: StorageLike = null;

	public fsLoader: FSComponentLoader;

	public constructor(tokenKey = 'BOT_TOKEN', clientOptions?: ClientOptions) {
		this.version = '1.0.0';

		this.tokenKey = tokenKey;
		this.clientOptions = clientOptions;
	}

	public setStorage(entity: StorageLike) {
		this.storage = entity;
	}

	public setClientOptions(clientOptions: ClientOptions) {
		this.clientOptions = clientOptions;
	}

	public async onLoad() {
		// no storage entity was provided use default RamStorage
		if (!this.storage) {
			const ramStorage = new RamStorage();
			await this.api.bento.addComponent(ramStorage);

			this.storage = ramStorage;
		}

		// attempt to resolve storage entity
		if (!this.api.hasEntity(this.storage)) throw new Error(`Storage Entity "${this.storage}" not found`);
		const entity = this.api.getEntity<StorageLike>(this.storage);
		this.storage = entity;

		// Create Own FSLoader instance
		this.fsLoader = new FSComponentLoader();
		this.fsLoader.name = 'BentocordFSComponentLoader';
		await this.api.bento.addPlugin(this.fsLoader);

		return this.api.loadComponents(this.fsLoader, __dirname, 'components');
	}
}