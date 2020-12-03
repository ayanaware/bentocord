import * as path from 'path';

import { FSComponentLoader, Plugin, PluginAPI } from '@ayanaware/bento';
import { ClientOptions } from 'eris';

import { BentocordVariable } from './BentocordVariable';
import { PermissionLike, SimplePermissions, SimpleStorage, StorageLike } from './plugins';

import { ArgumentManager } from './arguments';
import { CommandManager } from './commands';
import { Discord } from './discord';
import { InhibitorManager } from './inhibitors';
import { PromptManager } from './prompt';

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

		// Create Own FSLoader instance
		this.fsLoader = new FSComponentLoader();
		this.fsLoader.name = 'BentocordFSComponentLoader';
		await this.api.bento.addPlugin(this.fsLoader);

		// (this.fsloader as any) is Manual Component Loading, its a temp hack until new EntityLoaders are done

		// no storage entity was provided use default RamStorage
		if (!this.storage) {
			const simpleStorage: SimpleStorage = await (this.fsLoader as any).createInstance(path.resolve(__dirname, 'plugins', 'SimpleStorage'));
			await this.api.bento.addComponent(simpleStorage);

			this.storage = simpleStorage;
		} 

		// attempt to resolve provided storage entity
		if (!this.api.hasEntity(this.storage)) throw new Error(`Storage Entity "${this.storage}" not found`);
		const storage = this.api.getEntity<StorageLike>(this.storage);
		this.storage = storage;

		// no permission entity was provided use default
		if (!this.permissions) {
			const simplePermissions: SimplePermissions = await (this.fsLoader as any).createInstance(path.resolve(__dirname, 'plugins', 'SimplePermissions'));
			await this.api.bento.addComponent(simplePermissions);

			this.permissions = simplePermissions;
		}

		// attempt to resolve provided permission entity
		if (!this.api.hasEntity(this.permissions)) throw new Error(`Permissions Entity "${this.permissions}" not found`);
		const permissions = this.api.getEntity<PermissionLike>(this.permissions);
		this.permissions = permissions;

		// Load Discord, PromptManager, ArgumentManager, CommandManager

		const discord: Discord = await (this.fsLoader as any).createInstance(path.resolve(__dirname, 'discord'));
		await this.api.bento.addComponent(discord);

		const promptManager: PromptManager = await (this.fsLoader as any).createInstance(path.resolve(__dirname, 'prompt'));
		await this.api.bento.addComponent(promptManager);

		const argumentManager: ArgumentManager = await (this.fsLoader as any).createInstance(path.resolve(__dirname, 'arguments'));
		await this.api.bento.addComponent(argumentManager);

		const inhibitorManager: InhibitorManager = await (this.fsLoader as any).createInstance(path.resolve(__dirname, 'inhibitors'));
		await this.api.bento.addComponent(inhibitorManager);

		const commandManager: CommandManager = await (this.fsLoader as any).createInstance(path.resolve(__dirname, 'commands'));
		await this.api.bento.addComponent(commandManager);

		// load built-in commands
		const loadBuiltin = this.api.getVariable({ name: BentocordVariable.BENTOCORD_BUILTIN_COMMANDS, default: true });
		if (loadBuiltin) return this.api.loadComponents(this.fsLoader, __dirname, 'commands', 'builtin');
	}
}
