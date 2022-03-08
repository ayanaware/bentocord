import { ComponentAPI, Inject } from '@ayanaware/bento';

import { BentocordInterface } from '../../BentocordInterface';
import { CommandContext } from '../CommandContext';
import { CommandManager } from '../CommandManager';
import { OptionType } from '../constants/OptionType';
import { SuppressorType } from '../constants/SuppressorType';
import { CommandDefinition } from '../interfaces/CommandDefinition';
import { CommandEntity } from '../interfaces/entity/CommandEntity';

export class PrefixCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:PrefixCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['prefix'],
		description: 'Set command prefix',
		options: [
			{ type: OptionType.SUB_COMMAND, name: ['view', 'get'], description: 'View current prefix' },
			{ type: OptionType.SUB_COMMAND, name: ['set'], description: 'Set command prefix', options: [
				{ type: OptionType.STRING, name: 'prefix', description: 'new prefix', required: false },
			], permissionDefaults: { user: false, admin: true } },
		],

		suppressors: [SuppressorType.GUILD],

		registerSlash: false,
	};

	@Inject() private readonly commandManager: CommandManager;

	public async execute(ctx: CommandContext, options: { view?: Record<string, never>, set?: { prefix: string } }): Promise<unknown> {
		if (options.set) return this.set(ctx, options.set.prefix);

		if (!options.view) {
			/* literally how */
		}

		const prefix = await this.commandManager.getPrefix(ctx.guild.id);
		return ctx.createResponse(await ctx.formatTranslation('BENTOCORD_PREFIX', { prefix }) || `Current prefix is \`${prefix}\``);
	}

	private async set(ctx: CommandContext, prefix: string) {
		await this.commandManager.setPrefix(ctx.guild.id, prefix);

		return ctx.createResponse(await ctx.formatTranslation('BENTOCORD_PREFIX_SET', { prefix }) || `Prefix has been set to \`${prefix}\``);
	}
}
