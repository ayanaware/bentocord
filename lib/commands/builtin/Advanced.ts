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
		aliases: ['adv'],
		description: 'Meta Command. Takes passed arg and redirects to relevant command',
		options: [
			{ type: OptionType.STRING, name: 'alias', description: 'command name or alias' },
			{ type: OptionType.STRING, name: 'opts', description: 'option string to parse', required: false, rest: true },
		],

		registerSlash: true,
		disablePrefix: true,
	};

	public async execute(ctx: CommandContext, options: { alias: string, opts: string }): Promise<unknown> {
		if (this.definition.aliases.some(a => a.toLocaleLowerCase() === options.alias.toLocaleLowerCase())) return ctx.createResponse(await ctx.formatTranslation('BENTOCORD_ADV_NO_RECURSIVE') || 'Recursive execution is not allowed.');

		const command = this.cm.findCommand(options.alias);
		if (!command) return ctx.createResponse(await ctx.formatTranslation('BENTOCORD_ADV_NOTEXIST', { command: options.alias }) || `Command "${options.alias}" does not exist in CommandManager`);

		const definition = command.definition;

		// pre-flight checks, perms, suppressors, etc
		if (!(await this.cm.prepareCommand(command, ctx))) return;

		// fufill options
		const primary = definition.aliases[0];
		const cmdOptions = await this.cm.fufillTextOptions(ctx, definition.options, options.opts, [primary]);

		return this.cm.executeCommand(command, ctx, cmdOptions);
	}
}
