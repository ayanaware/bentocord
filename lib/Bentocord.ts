import { FSComponentLoader, Plugin, PluginAPI } from '@ayanaware/bento';
import { ClientOptions } from 'eris';

import { BentocordVariable } from './BentocordVariable';
import { PermissionLike, StorageLike } from './interfaces';
import { RamStorage, Permissions } from './util';

import { Logger } from '@ayanaware/logger-api';
const log = Logger.get();

export class Bentocord implements Plugin {
	public name = 'Bentocord';
	public version: string;
	public api!: PluginAPI;

	public clientOptions: ClientOptions;

	public storage: StorageLike;
	public permissions: PermissionLike;

	public fsLoader: FSComponentLoader;

	public constructor(clientOptions?: ClientOptions) {
		try {
			const { version } = require('../package.json');
			this.version = version;
		} catch (e) {
			this.version = 'Error';
		}

		this.clientOptions = clientOptions;
	}

	public setClientOptions(clientOptions: ClientOptions) {
		this.clientOptions = clientOptions;
	}

	public async onLoad() {
		this.storage = this.api.getVariable({ name: BentocordVariable.BENTOCORD_STORAGE_ENTITY, default: null });
		this.permissions = this.api.getVariable({ name: BentocordVariable.BENTOCORD_PERMISSIONS_ENTITY, default: null });

		// no storage entity was provided use default RamStorage
		if (!this.storage) {
			const storage = new RamStorage();
			await this.api.bento.addComponent(storage);

			this.storage = storage;
		} else {
			// attempt to resolve provided storage entity
			if (!this.api.hasEntity(this.storage)) throw new Error(`Storage Entity "${this.storage}" not found`);
			const storage = this.api.getEntity<StorageLike>(this.storage);
			this.storage = storage;
		}

		// no permission entity was provided use default
		if (!this.permissions) {
			const permissions = new Permissions();
			await this.api.bento.addComponent(permissions);

			this.permissions = permissions;
		} else {
			// attempt to resolve provided permission entity
			if (!this.api.hasEntity(this.permissions)) throw new Error(`Permissions Entity "${this.permissions}" not found`);
			const permissions = this.api.getEntity<PermissionLike>(this.permissions);
			this.permissions = permissions;
		}

		// Create Own FSLoader instance
		this.fsLoader = new FSComponentLoader();
		this.fsLoader.name = 'BentocordFSComponentLoader';
		await this.api.bento.addPlugin(this.fsLoader);

		await this.api.loadComponents(this.fsLoader, __dirname, 'components');

		// load built-in commands
		const loadBuiltin = this.api.getVariable({ name: BentocordVariable.BENTOCORD_BUILTIN_COMMANDS, default: true });
		if (loadBuiltin) return this.api.loadComponents(this.fsLoader, __dirname, 'commands');
	}
}