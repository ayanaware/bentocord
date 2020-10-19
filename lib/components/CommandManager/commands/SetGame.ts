import { ComponentAPI, Inject } from '@ayanaware/bento';
import { ActivityPartial, BotActivityType } from 'eris';

import Discord from '../../Discord';
import { Command } from '../Command';
import { CommandContext } from '../CommandContext';
import { CommandManager } from '../CommandManager';

export class SetGame implements Command {
	public name = 'bentocordSetGame';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public aliases = ['setgame'];

	@Inject(Discord)
	private discord: Discord;

	public async execute(ctx: CommandContext) {
		if (!ctx.isOwner()) return ctx.messenger.createMessage(`This command can only be executed by a Bot Owner`);

		if (ctx.args.length < 2) return ctx.messenger.createMessage(`${ctx.alias} [type] Example Status Message`);

		const game: ActivityPartial<BotActivityType> = { type: null, name: null };

		const type = parseInt(ctx.nextArg());
		if ([0, 1, 2, 3].includes(type)) {
			return ctx.messenger.createMessage('Type must be one of the following: `0, 1, 2, 3`. Reference: https://discord.com/developers/docs/game-sdk/activities#data-models-activitytype-enum');
		}

		game.type = type as BotActivityType;
		game.name = ctx.remainingArgs().join(' ');

		this.discord.client.editStatus('online', game);

		return ctx.messenger.createMessage('Presence Updated!')
	}
}