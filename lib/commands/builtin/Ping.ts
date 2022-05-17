import { ComponentAPI } from '@ayanaware/bento';

import { AnyCommandContext } from '../CommandContext';
import { CommandManager } from '../CommandManager';
import { CommandDefinition } from '../interfaces/CommandDefinition';
import { CommandEntity } from '../interfaces/entity/CommandEntity';

export class PingCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:PingCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;
	public replaceable = true;

	public definition: CommandDefinition = {
		name: ['ping', 'pong', { key: 'BENTOCORD_COMMAND_PING' }, { key: 'BENTOCORD_COMMAND_PONG' }],
		description: { key: 'BENTOCORD_COMMAND_PING_DESCRIPTION', backup: 'Check if the bot is online' },
	};

	public async execute(ctx: AnyCommandContext): Promise<unknown> {
		const start = process.hrtime();
		await ctx.createTranslatedResponse('BENTOCORD_PING', {}, 'Pong!');
		const end = process.hrtime(start);

		const s = end[0];
		const ms = end[1] / 1000000;

		// if in guild, include shard latency. message should really include a shard
		if (ctx.guild) {
			const ws = ctx.guild.shard.latency;
			if (ws !== Infinity) {
				return ctx.editTranslatedResponse('BENTOCORD_PING_COUNT_WS', { s, ms, ws }, 'Pong! API: `{s}s {ms}ms`, Gateway: `{ws}ms`');
			}
		}

		return ctx.editTranslatedResponse('BENTOCORD_PING_COUNT', { s, ms }, 'Pong! `{s}s {ms}ms`');
	}
}
