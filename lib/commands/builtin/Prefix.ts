import { ComponentAPI, Inject } from '@ayanaware/bento';

import { BentocordInterface } from '../../BentocordInterface';
import { CommandContext } from '../CommandContext';
import { CommandManager } from '../CommandManager';
import { OptionType } from '../constants/OptionType';
import { CommandDefinition } from '../interfaces/CommandDefinition';
import { CommandEntity } from '../interfaces/entity/CommandEntity';

export class PrefixCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:PrefixCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['prefix'],
		description: 'Set bot prefix',
		options: [
			{ type: OptionType.STRING, name: 'prefix', description: 'New Prefix', required: false },
		],

		registerSlash: false,
	};

	@Inject() private readonly interface: BentocordInterface;

	public async execute(ctx: CommandContext, options: { prefix?: string }): Promise<unknown> {
		if (!ctx.guild) return ctx.createResponse('This command can only be run in a Guild');

		// handle `prefix set`
		if (options.prefix) return this.set(ctx, options.prefix);

		const prefix = await this.interface.getPrefix(ctx.guild.id);
		return ctx.createResponse(`This Guild's prefix is \`${prefix}\`.`);
	}

	private async set(ctx: CommandContext, newPrefix: string) {
		// TODO: add permission check
		await this.interface.setPrefix(ctx.guild.id, newPrefix);

		return ctx.createResponse(`This Guild's prefix has been set to \`${newPrefix}\``);
	}
}
