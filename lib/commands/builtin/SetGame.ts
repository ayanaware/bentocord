import { ComponentAPI, Inject, Subscribe, Variable } from '@ayanaware/bento';
import { Logger } from '@ayanaware/logger-api';

import { ActivityPartial, BotActivityType, Shard } from 'eris';

import { BentocordVariable } from '../../BentocordVariable';
import { Discord } from '../../discord/Discord';
import { DiscordEvent } from '../../discord/constants/DiscordEvent';
import { AnyCommandContext } from '../CommandContext';
import { CommandManager } from '../CommandManager';
import { OptionType } from '../constants/OptionType';
import { SuppressorType } from '../constants/SuppressorType';
import { CommandDefinition } from '../interfaces/CommandDefinition';
import { CommandEntity } from '../interfaces/entity/CommandEntity';

const log = Logger.get();
export class SetGameCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:SetGameCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;
	public replaceable = true;

	@Inject() private readonly discord: Discord;
	private activity: ActivityPartial<BotActivityType>;

	@Variable({ name: BentocordVariable.BENTOCORD_ACTIVITY_NAME, default: 'with Bentocord' })
	private readonly default: string;

	public definition: CommandDefinition = {
		name: ['setgame', { key: 'BENTOCORD_COMMAND_SETGAME' }],
		description: { key: 'BENTOCORD_COMMAND_SETGAME_DESCRIPTION', backup: 'Set the bot\'s game status' },
		options: [
			{ type: OptionType.SUB_COMMAND, name: ['playing'], description: { key: 'BENTOCORD_COMMAND_SETGAME_PLAYING_DESCRIPTION', backup: 'Set the bot status to playing' }, options: [
				{ type: OptionType.STRING, name: ['activity'], description: { key: 'BENTOCORD_OPTION_ACTIVITY_DESCRIPTION', backup: 'The activity to set' }, rest: true },
			] },
			{ type: OptionType.SUB_COMMAND, name: ['streaming'], description: { key: 'BENTOCORD_COMMAND_SETGAME_STREAMING_DESCRIPTION', backup: 'Set the bot status to streaming' }, options: [
				{ type: OptionType.STRING, name: ['url'], description: { key: 'BENTOCORD_OPTION_URL_DESCRIPTION', backup: 'The activity url' } },
				{ type: OptionType.STRING, name: ['activity'], description: { key: 'BENTOCORD_OPTION_ACTIVITY_DESCRIPTION', backup: 'The activity to set' }, rest: true },
			] },
			{ type: OptionType.SUB_COMMAND, name: ['listening'], description: { key: 'BENTOCORD_COMMAND_SETGAME_LISTENING_DESCRIPTION', backup: 'Set the bot status to listening' }, options: [
				{ type: OptionType.STRING, name: ['activity'], description: { key: 'BENTOCORD_OPTION_ACTIVITY_DESCRIPTION', backup: 'The activity to set' }, rest: true },
			] },
			{ type: OptionType.SUB_COMMAND, name: ['watching'], description: { key: 'BENTOCORD_COMMAND_SETGAME_WATCHING_DESCRIPTION', backup: 'Set the bot status to watching' }, options: [
				{ type: OptionType.STRING, name: ['activity'], description: { key: 'BENTOCORD_OPTION_ACTIVITY_DESCRIPTION', backup: 'The activity to set' }, rest: true },
			] },
			{ type: OptionType.SUB_COMMAND, name: ['competing'], description: { key: 'BENTOCORD_COMMAND_SETGAME_COMPETING_DESCRIPTION', backup: 'Set the botstatus to competing' }, options: [
				{ type: OptionType.STRING, name: ['activity'], description: { key: 'BENTOCORD_OPTION_ACTIVITY_DESCRIPTION', backup: 'The activity to set' }, rest: true },
			] },

			// support for custom status
			{ type: OptionType.SUB_COMMAND, name: ['custom'], description: { key: 'BENTOCORD_COMMAND_SETGAME_CUSTOM_DESCRIPTION', backup: 'Set the bot status to a custom type' }, options: [
				{ type: OptionType.INTEGER, name: ['type'], description: { key: 'BENTOCORD_OPTION_TYPE_DESCRIPTION', backup: 'The type of custom status' } },
				{ type: OptionType.STRING, name: ['activity'], description: { key: 'BENTOCORD_OPTION_ACTIVITY_DESCRIPTION', backup: 'The activity to set' }, rest: true },
			] },
		],

		hidden: true,
		registerSlash: false,

		suppressors: [SuppressorType.BOT_OWNER],
	};

	public async execute(ctx: AnyCommandContext, options: {
		playing?: { activity: string },
		streaming?: { activity: string, url: string },
		listening?: { activity: string },
		watching?: { activity: string },
		competing?: { activity: string },
		custom?: { type: number, activity: string },
	}): Promise<unknown> {
		const activity: ActivityPartial<BotActivityType> = { name: null };

		if (options.playing) {
			activity.type = 0;
			activity.name = options.playing.activity;
		} else if (options.streaming) {
			activity.type = 1;
			activity.name = options.streaming.activity;
			activity.url = options.streaming.url;
		} else if (options.listening) {
			activity.type = 2;
			activity.name = options.listening.activity;
		} else if (options.watching) {
			activity.type = 3;
			activity.name = options.watching.activity;
		} else if (options.competing) {
			activity.type = 5;
			activity.name = options.competing.activity;
		} else if (options.custom) {
			activity.type = options.custom.type as BotActivityType; // trick eris go brr
			activity.name = options.custom.activity;
		}

		await this.setActivity(activity);

		return ctx.createTranslatedResponse('BENTOCORD_PRESENCE_UPDATED', {}, 'Presence Updated!');
	}

	/**
	 * Store the activity for the bot, and apply it to all ready shards.
	 * @param activity The activity to set the bot to.
	 */
	protected async setActivity(activity: ActivityPartial<BotActivityType>): Promise<void> {
		this.activity = activity;

		for (const [, shard] of this.discord.client.shards) await this.restoreActivity(shard.id);
	}

	/**
	 * Fetch activity for the bot
	 * @returns The activity for the bot.
	 */
	protected async getActivity(): Promise<ActivityPartial<BotActivityType>> {
		if (!this.activity) return { name: this.default };

		return this.activity;
	}

	/**
	 * Transform the activity before setting, useful for replacements
	 * @param activity The activity to transform
	 * @param shard The shard to transform the activity for
	 * @returns The transformed activity
	 */
	protected async formatActivity(activity: ActivityPartial<BotActivityType>, shard: Shard): Promise<ActivityPartial<BotActivityType>> {
		return activity;
	}

	@Subscribe(Discord, DiscordEvent.SHARD_READY)
	@Subscribe(Discord, DiscordEvent.SHARD_RESUME)
	protected async restoreActivity(id: number): Promise<void> {
		// attempt to get shard
		const shard = this.discord.client.shards.get(id);
		if (!shard || !shard.ready) return;

		// get activity
		let activity = await this.getActivity();
		if (!activity) return;

		// format activity & set
		activity = await this.formatActivity(activity, shard);
		shard.editStatus(activity);

		// log
		log.info(`Set activity: ${JSON.stringify(activity)}`, `Shard ${id}`);
	}
}
