import { ComponentAPI, Inject } from '@ayanaware/bento';

import { ActivityPartial, BotActivityType } from 'eris';

import { Discord } from '../../discord/Discord';
import { CommandContext } from '../CommandContext';
import { CommandManager } from '../CommandManager';
import { OptionType } from '../constants/OptionType';
import { SuppressorType } from '../constants/SuppressorType';
import { CommandDefinition } from '../interfaces/CommandDefinition';
import { CommandEntity } from '../interfaces/entity/CommandEntity';

export class SetGameCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:SetGameCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		name: ['setgame', { key: 'BENTOCORD_COMMAND_SETGAME' }],
		description: { key: 'BENTOCORD_COMMAND_SETGAME_DESCRIPTION', backup: 'Set the bot\'s game status' },
		options: [
			{ type: OptionType.STRING, name: ['activity', { key: 'BENTOCORD_OPTION_ACTIVITY' }], description: { key: 'BENTOCORD_OPTION_ACTIVITY_DESCRIPTION', backup: 'Activity name' }, rest: true },
			{ type: OptionType.INTEGER, name: ['type', { key: 'BENTOCORD_OPTION_TYPE' }], description: { key: 'BENTOCORD_OPTION_TYPE_DESCRIPTION', backup: 'Type' }, choices: [
				{ name: 'playing', value: 0 },
				{ name: 'streaming', value: 1 },
				{ name: 'listening', value: 2 },
				{ name: 'watching', value: 3 },
				{ name: 'competing', value: 5 },
			], default: 0, required: false },
		],

		suppressors: [SuppressorType.BOT_OWNER],
		hidden: true,

		registerSlash: false,
	};

	@Inject(Discord) private readonly discord: Discord;

	public async execute(ctx: CommandContext, options: { type: number, activity: string }): Promise<unknown> {
		const game: ActivityPartial<BotActivityType> = { type: options.type as BotActivityType, name: options.activity };

		this.discord.client.editStatus('online', game);
		return ctx.createTranslatedResponse('BENTOCORD_PRESENCE_UPDATED', {}, 'Presence Updated!');
	}
}
