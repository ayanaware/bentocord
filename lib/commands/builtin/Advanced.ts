import { ComponentAPI, Inject } from '@ayanaware/bento';

import { CommandContext } from '../CommandContext';
import { CommandManager, NON_ERROR_HALT } from '../CommandManager';
import { OptionType } from '../constants/OptionType';
import { CommandDefinition } from '../interfaces/CommandDefinition';
import { CommandEntity } from '../interfaces/entity/CommandEntity';

export class AdvancedCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:AdvancedCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;

	@Inject() private readonly cm: CommandManager;

	public definition: CommandDefinition = {
		aliases: [{ key: 'BENTOCORD_COMMAND_ADV', backup: 'advanced' }],
		description: { key: 'BENTOCORD_DESCRIPTION_ADV', backup: 'Run non-slash exposed commands' },
		options: [
			{ type: OptionType.STRING, name: { key: 'BENTOCORD_OPTION_ALIAS', backup: 'alias' }, description: { key: 'BENTOCORD_OPTION_ALIAS_DESCRIPTION', backup: 'Command name or alias' } },
			{ type: OptionType.STRING, name: { key: 'BENTOCORD_OPTION_OPTIONS', backup: 'options' }, description: { key: 'BENTOCORD_OPTION_OPTIONS_DESCRIPTION', backup: 'Command arguments to pass' }, required: false, rest: true },
		],

		registerSlash: true,
		disablePrefix: true,
	};

	public async execute(ctx: CommandContext, options: { alias: string, opts: string }): Promise<unknown> {
		const aliases = await this.cm.getItemTranslations(this.definition.aliases, true);
		if (aliases.some(a => a.main === options.alias.toLocaleLowerCase())) return ctx.createResponse(await ctx.formatTranslation('BENTOCORD_ADV_NO_RECURSIVE') || 'Recursive execution is not allowed.');

		const command = this.cm.findCommand(options.alias);
		if (!command) return ctx.createResponse(await ctx.formatTranslation('BENTOCORD_ADV_NOTEXIST', { command: options.alias }) || `Command "${options.alias}" does not exist in CommandManager`);

		const definition = command.definition;

		// pre-flight checks, perms, suppressors, etc
		if (!(await this.cm.prepareCommand(command, ctx))) return;

		// fufill options
		const cmdOptions = await this.cm.fufillTextOptions(ctx, definition, options.opts);

		return this.cm.executeCommand(command, ctx, cmdOptions);
	}
}
