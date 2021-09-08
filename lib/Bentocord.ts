import 'reflect-metadata';

import { FSEntityLoader, Plugin, PluginAPI } from '@ayanaware/bento';

import { BentocordInterface } from './BentocordInterface';
import { BentocordVariable } from './BentocordVariable';
import { CommandManager } from './commands/CommandManager';
import { Discord } from './discord/Discord';

export class Bentocord implements Plugin {
	public name = '@ayanaware/bentocord';
	public version: string;
	public api!: PluginAPI;

	public fsel: FSEntityLoader;

	public constructor() {
		try {
			// ESLint Hates him, check out this one weird trick
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires, import/extensions
			const { version } = require('../package.json');
			this.version = version as string || 'Error';
		} catch (e) {
			this.version = 'Error';
		}
	}

	public async onLoad(): Promise<void> {
		const entityManager = this.api.getBento().entities;
		// Load BentocordInterface
		await entityManager.addPlugin(BentocordInterface);

		await entityManager.addComponents([
			Discord,
			CommandManager,
		]);

		// Load built-in commands
		const loadBuiltin = this.api.getVariable<boolean>({ name: BentocordVariable.BENTOCORD_BUILTIN_COMMANDS, default: true });
		if (loadBuiltin) {
			// get prexisting FSEntityLoader, or create one just for us
			this.fsel = entityManager.getPlugin(FSEntityLoader);
			if (!this.fsel) {
				this.fsel = new (class extends FSEntityLoader {
					name = '@ayanaware/bentocord:FSEntityLoader';
				})();

				await entityManager.addPlugin(this.fsel);
			}

			return this.fsel.addDirectory([__dirname, 'commands', 'builtin']);
		}
	}
}
