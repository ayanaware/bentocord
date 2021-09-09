import { ComponentAPI, Inject } from '@ayanaware/bento';

import { CommandContext } from '../CommandContext';
import { CommandManager } from '../CommandManager';
import { OptionType } from '../constants/OptionType';
import { CommandDefinition } from '../interfaces/CommandDefinition';
import { CommandEntity } from '../interfaces/entity/CommandEntity';

export class AdvancedCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:AdvancedCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;

	@Inject() private readonly commandManager: CommandManager;

	public definition: CommandDefinition = {
		aliases: ['adv'],
		description: 'Meta Command. Takes passed arg and redirects to relevant command',
		options: [
			{ type: OptionType.STRING, name: 'alias', description: 'Command name or alias' },
			{ type: OptionType.STRING, name: 'opts', description: 'option string to parse', required: false, rest: true },
		],

		registerSlash: true,
		disablePrefix: true,
	};

	public async execute(ctx: CommandContext, options: { alias: string, opts: string }): Promise<unknown> {
		const command = this.commandManager.findCommand(options.alias);
		if (!command) return ctx.createResponse(await ctx.getTranslation('BENTOCORD_ADV_NOTEXIST', { command: options.alias }) || `Command "${options.alias}" does not exist in CommandManager`);

		const cmdOptions = await this.commandManager.fufillTextOptions(ctx, command.definition.options, options.opts);
		return this.commandManager.executeCommand(command, ctx, cmdOptions);
	}
}
