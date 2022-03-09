import { ComponentAPI } from '@ayanaware/bento';

import { CommandContext } from '../CommandContext';
import { CommandManager } from '../CommandManager';
import { CommandDefinition } from '../interfaces/CommandDefinition';
import { CommandEntity } from '../interfaces/entity/CommandEntity';

export class PingCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:PingCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['ping', 'pong'],
		description: 'Check if bot alive',
	};

	public async execute(ctx: CommandContext): Promise<unknown> {
		const start = process.hrtime();
		await ctx.createResponse(await ctx.formatTranslation('BENTOCORD_PING') || 'Pong!');
		const end = process.hrtime(start);

		const s = end[0];
		const ms = end[1] / 1000000;

		// if in guild, include shard latency. message should really include a shard
		if (ctx.guild) {
			const ws = ctx.guild.shard.latency;
			if (ws !== Infinity) {
				return ctx.editResponse(await ctx.formatTranslation('BENTOCORD_PING_COUNT_WS', { s, ms, ws }) || `Pong! API: \`${s}s ${ms}ms\`, Gateway: \`${ws}ms\`)`);
			}
		}

		return ctx.editResponse(await ctx.formatTranslation('BENTOCORD_PING_COUNT', { s, ms }) || `Pong! \`${s}s ${ms}ms\``);
	}
}
