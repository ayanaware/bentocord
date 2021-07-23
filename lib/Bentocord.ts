import 'reflect-metadata';

import { EntityType, FSEntityLoader, Plugin, PluginAPI } from '@ayanaware/bento';
import { ClientOptions } from 'eris';

import { BentocordVariable } from './BentocordVariable';

import { Logger } from '@ayanaware/logger-api';
const log = Logger.get();

export type Type<T> = new(...args: Array<any>) => T;

export class Bentocord implements Plugin {
	public name = '@ayanaware/bentocord';
	public version: string;
	public api!: PluginAPI;

	public clientOptions: ClientOptions;

	public fsel: FSEntityLoader;

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
		// get prexisting FSEntityLoader, or create one just for us
		this.fsel = await this.api.getBento().getPlugin(FSEntityLoader);
		if (!this.fsel) {
			this.fsel = new (class extends FSEntityLoader {
				name = '@ayanaware/bentocord:FSEntityLoader'
			})();

			this.api.getBento().addPlugin(this.fsel);
		}

		// Load Plugins
		await this.fsel.addDirectory([__dirname, 'plugins'], EntityType.PLUGIN, false);

		// Load Components
		await this.fsel.addDirectories([
			[__dirname, 'arguments'],
			[__dirname, 'commands'],
			[__dirname, 'discord'],
			[__dirname, 'inhibitors'],
			[__dirname, 'prompt'],
		], EntityType.COMPONENT, false);

		// Load built-in commands
		const loadBuiltin = this.api.getVariable<boolean>({ name: BentocordVariable.BENTOCORD_BUILTIN_COMMANDS, default: true });
		if (loadBuiltin) return this.fsel.addDirectory([__dirname, 'commands', 'builtin']);
	}
}
