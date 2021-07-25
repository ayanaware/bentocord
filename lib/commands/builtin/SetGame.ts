import { ComponentAPI, Inject } from '@ayanaware/bento';
import { ActivityPartial, BotActivityType } from 'eris';

import { ArgumentType } from '../../arguments';
import { Discord } from '../../discord';

import { CommandDefinition, CommandEntity } from '../interfaces';
import { CommandManager } from '../CommandManager';
import { CommandContext } from '../CommandContext';

export class SetGameCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:SetGameCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['setgame'],
		args: [
			{ type: ArgumentType.NUMBER, name: 'type' },
			{ type: ArgumentType.STRING, name: 'status', rest: true },
		]
	}

	@Inject(Discord) private discord: Discord;

	public async execute(ctx: CommandContext) {
		if (!ctx.isOwner()) return ctx.messenger.createMessage(`You lack permission to perform this command.`);

		if (ctx.args.length < 2) return ctx.messenger.createMessage(`Usage: \`${ctx.alias} [type] Example Status Message\``);

		const game: ActivityPartial<BotActivityType> = { type: null, name: null };

		const type = ctx.args.type;
		if (![0, 1, 2, 3].includes(type)) {
			return ctx.messenger.createMessage('Type must be one of the following: `0, 1, 2, 3`. Reference: https://discord.com/developers/docs/game-sdk/activities#data-models-activitytype-enum');
		}

		game.type = type as BotActivityType;
		game.name = ctx.args.status;

		this.discord.client.editStatus('online', game);

		return ctx.messenger.createMessage('Presence Updated!')
	}
}