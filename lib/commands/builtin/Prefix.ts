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
			{ type: OptionType.STRING, name: 'prefix', description: 'new prefix', required: false },
		],

		suppressors: [SuppressorType.GUILD, SuppressorType.GUILD_ADMIN],

		registerSlash: false,
	};

	@Inject() private readonly commandManager: CommandManager;

	public async execute(ctx: CommandContext, options: { prefix?: string }): Promise<unknown> {
		if (options.prefix) return this.set(ctx, options.prefix);

		const prefix = await this.commandManager.getPrefix(ctx.guild.id);
		return ctx.createResponse(await ctx.formatTranslation('BENTOCORD_PREFIX', { prefix }) || `Current prefix is \`${prefix}\``);
	}

	private async set(ctx: CommandContext, prefix: string) {
		await this.commandManager.setPrefix(ctx.guild.id, prefix);

		return ctx.createResponse(await ctx.formatTranslation('BENTOCORD_PREFIX_SET', { prefix }) || `Prefix has been set to \`${prefix}\``);
	}
}
