import { ComponentAPI, Inject } from '@ayanaware/bento';

import { AnyCommandContext } from '../CommandContext';
import { CommandManager } from '../CommandManager';
import { OptionType } from '../constants/OptionType';
import { CommandDefinition } from '../interfaces/CommandDefinition';
import { CommandEntity } from '../interfaces/entity/CommandEntity';

export class AdvancedCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:AdvancedCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;
	public replaceable = true;

	@Inject() private readonly cm: CommandManager;

	public definition: CommandDefinition = {
		name: ['advanced', { key: 'BENTOCORD_COMMAND_ADV' }],
		description: { key: 'BENTOCORD_COMMAND_ADV_DESCRIPTION', backup: 'Run non-slash exposed commands' },
		options: [
			{ type: OptionType.STRING, name: ['alias', { key: 'BENTOCORD_OPTION_ALIAS' }], description: { key: 'BENTOCORD_OPTION_ALIAS_DESCRIPTION', backup: 'Command name or alias' } },
			{ type: OptionType.STRING, name: ['options', { key: 'BENTOCORD_OPTION_OPTIONS' }], description: { key: 'BENTOCORD_OPTION_OPTIONS_DESCRIPTION', backup: 'Command arguments to pass' }, required: false, rest: true },
		],

		registerSlash: true,
		disablePrefix: true,
	};

	public async execute(ctx: AnyCommandContext, options: { alias: string, options: string }): Promise<unknown> {
		const aliases = await this.cm.getItemTranslations(this.definition.name, true);
		if (aliases.some(a => a[0] === options.alias.toLocaleLowerCase())) return ctx.createTranslatedResponse('BENTOCORD_ADV_NO_RECURSIVE', {}, 'Recursive execution is not allowed.');

		const command = this.cm.findCommand(options.alias);
		if (!command) return ctx.createTranslatedResponse('BENTOCORD_ADV_NOTEXIST', { command: options.alias }, 'Command "{command}" does not exist in CommandManager');

		const definition = command.definition;

		// pre-flight checks, perms, suppressors, etc
		if (!(await this.cm.prepareCommand(command, ctx))) return;

		// fufill options
		const cmdOptions = await this.cm.fufillTextOptions(ctx, definition, options.options);

		return this.cm.executeCommand(command, ctx, cmdOptions);
	}
}
