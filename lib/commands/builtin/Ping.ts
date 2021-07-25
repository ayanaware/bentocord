import { ComponentAPI } from '@ayanaware/bento';

import { CommandDefinition, CommandEntity } from '../interfaces';
import { CommandManager } from '../CommandManager';
import { CommandContext } from '../CommandContext';

export class PingCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:PingCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['ping', 'pong'],
	};

	public async execute(ctx: CommandContext) {
		const start = process.hrtime();
		const message = await ctx.messenger.createMessage('Pong!');
		const end = process.hrtime(start);

		const s = end[0];
		const ms = end[1] / 1000000; 

		return ctx.messenger.updateMessage(message, `Pong! \`${s}s ${ms}ms\``);
	}
}