import 'reflect-metadata';

import { FSEntityLoader, Plugin, PluginAPI } from '@ayanaware/bento';

import { BentocordInterface } from './BentocordInterface';
import { BentocordVariable } from './BentocordVariable';
import { CommandManager } from './commands/CommandManager';
import { HelpManager } from './commands/HelpManager';
import { AdvancedCommand } from './commands/builtin/Advanced';
import { BentoCommand } from './commands/builtin/Bento';
import { PingCommand } from './commands/builtin/Ping';
import { PrefixCommand } from './commands/builtin/Prefix';
import { SetGameCommand } from './commands/builtin/SetGame';
import { SlashCommand } from './commands/builtin/Slash';
import { Discord } from './discord/Discord';
import { PromptManager } from './prompt/PromptManager';
import { ReplyCommand } from './prompt/commands/Reply';

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
			PromptManager,
			CommandManager,
			HelpManager,
			ReplyCommand,
		]);

		// Load built-in commands
		const loadBuiltin = this.api.getVariable<boolean>({ name: BentocordVariable.BENTOCORD_BUILTIN_COMMANDS, default: true });
		if (!loadBuiltin) return;

		await entityManager.addComponents([
			AdvancedCommand,
			BentoCommand,
			PingCommand,
			PrefixCommand,
			SetGameCommand,
			SlashCommand,
		]);
	}
}
