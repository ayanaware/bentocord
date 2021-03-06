import { ComponentAPI, Inject } from '@ayanaware/bento';

import { AnyCommandContext } from '../CommandContext';
import { CommandManager } from '../CommandManager';
import { OptionType } from '../constants/OptionType';
import { CommandDefinition } from '../interfaces/CommandDefinition';
import { CommandEntity } from '../interfaces/entity/CommandEntity';

export class PrefixCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:PrefixCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;
	public replaceable = true;

	@Inject() protected readonly cm: CommandManager;

	public definition: CommandDefinition = {
		name: ['prefix', { key: 'BENTOCORD_COMMAND_PREFIX' }],
		description: { key: 'BENTOCORD_COMMAND_PREFIX_DESCRIPTION', backup: 'Manage command prefix' },
		options: [
			{ type: OptionType.SUB_COMMAND, name: ['view', 'get', { key: 'BENTOCORD_COMMAND_PREFIX_VIEW' }], description: { key: 'BENTOCORD_COMMAND_PREFIX_VIEW_DESCRIPTION', backup: 'View prefix' } },
			{ type: OptionType.SUB_COMMAND, name: ['set', { key: 'BENTOCORD_COMMAND_PREFIX_SET' }], description: { key: 'BENTOCORD_COMMAND_PREFIX_SET_DESCRIPTION', backup: 'Set prefix' }, options: [
				{ type: OptionType.STRING, name: ['prefix', { key: 'BENTOCORD_OPTION_PREFIX' }], description: { key: 'BENTOCORD_OPTION_PREFIX_DESCRIPTION', backup: 'New prefix' } },
			], permissionDefaults: { user: false, admin: true } },
		],

		allowDM: false,
		registerSlash: false,
	};

	public async execute(ctx: AnyCommandContext, options: { view?: Record<string, never>, set?: { prefix: string } }): Promise<unknown> {
		if (options.set) return this.set(ctx, options.set.prefix);

		if (!options.view) {
			/* literally how */
		}

		const prefix = await this.cm.getPrefix(ctx.guild.id);
		return ctx.createTranslatedResponse('BENTOCORD_PREFIX', { prefix }, 'Current prefix is `{prefix}`');
	}

	private async set(ctx: AnyCommandContext, prefix: string) {
		await this.cm.setPrefix(ctx.guild.id, prefix);

		return ctx.createTranslatedResponse('BENTOCORD_PREFIX_SET', { prefix }, 'Prefix has been set to `{prefix}`');
	}
}
