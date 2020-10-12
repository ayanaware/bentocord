import { FSComponentLoader, Plugin, PluginAPI, Variable } from '@ayanaware/bento';
import { ClientOptions } from 'eris';

import { BentocordVariable } from './constants';
import { StorageLike } from './interfaces';
import { RamStorage } from './util';

import { Logger } from '@ayanaware/logger-api';
const log = Logger.get();

export class Bentocord implements Plugin {
	public name = 'Bentocord';
	public version: string;
	public api!: PluginAPI;

	public clientOptions: ClientOptions;

	public storage: StorageLike;
	public fsLoader: FSComponentLoader;

	public constructor(clientOptions?: ClientOptions) {
		this.version = '1.0.0';
		this.clientOptions = clientOptions;
	}

	public setClientOptions(clientOptions: ClientOptions) {
		this.clientOptions = clientOptions;
	}

	public async onLoad() {
		this.storage = this.api.getVariable({ name: BentocordVariable.BENTOCORD_STORAGE_ENTITY, default: null });

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