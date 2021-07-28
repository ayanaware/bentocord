import 'reflect-metadata';

import { FSEntityLoader, Plugin, PluginAPI } from '@ayanaware/bento';
import { ClientOptions } from 'eris';

import { BentocordInterface } from './BentocordInterface';
import { BentocordVariable } from './BentocordVariable';

import ArgumentManager from './arguments';
import CommandManager from './commands';
import Discord from './discord';
import InhibitorManager from './inhibitors';
import PromptManager from './prompt';

import { Logger } from '@ayanaware/logger-api';
const log = Logger.get();

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
		const bento = this.api.getBento();

		// Load BentocordInterface
		await bento.entities.addPlugin(BentocordInterface);

		// Load Bentocord Components
		for (const component of [
			ArgumentManager,
			CommandManager,
			Discord,
			InhibitorManager,
			PromptManager
		]) await bento.entities.addComponent(component);

		// Load built-in commands
		const loadBuiltin = this.api.getVariable<boolean>({ name: BentocordVariable.BENTOCORD_BUILTIN_COMMANDS, default: true });
		if (loadBuiltin) {
			// get prexisting FSEntityLoader, or create one just for us
			this.fsel = await this.api.getBento().getPlugin(FSEntityLoader);
			if (!this.fsel) {
				this.fsel = new (class extends FSEntityLoader {
					name = '@ayanaware/bentocord:FSEntityLoader'
				})();

				await bento.entities.addPlugin(this.fsel);
			}

			return this.fsel.addDirectory([__dirname, 'commands', 'builtin']);
		}
	}
}
