import { ComponentAPI } from '@ayanaware/bento';

import { CommandContext } from '../CommandContext';
import { CommandManager } from '../CommandManager';
import { CommandDefinition } from '../interfaces/CommandDefinition';
import { CommandEntity } from '../interfaces/CommandEntity';

export class PingCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:PingCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['ping', 'pong'],
		description: 'Check if bot alive',

		registerSlash: false,
	};

	public async execute(ctx: CommandContext): Promise<unknown> {
		const start = process.hrtime();
		await ctx.createResponse('Pong!');
		const end = process.hrtime(start);

		const s = end[0];
		const ms = end[1] / 1000000;

		return ctx.editResponse(`Pong! \`${s}s ${ms}ms\``);
	}
}
