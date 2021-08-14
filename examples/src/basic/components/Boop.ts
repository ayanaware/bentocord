import { ComponentAPI, Entity } from '@ayanaware/bento';
import {
	ArgumentType,
	CommandContext,
	CommandDefinition,
	CommandEntity,
	CommandManager,
	DiscordPermission,
	InhibitorType,
} from '@ayanaware/bentocord';

import { User } from 'eris';

export class Boop implements CommandEntity {
	public name = 'Boop';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['boop'],
		inhibitors: [
			{ execute: InhibitorType.BOT_OWNER },
			() => 'Bad Inhibitor >:) I block everything!',
		],
		selfPermissions: [],
		args: [
			{
				type: ArgumentType.MEMBER, name: 'target',
				rest: true, prompt: { startText: 'Target a user' },
			},
		],
	};

	public async execute(ctx: CommandContext) {
		const target: User = ctx.args.target;

		return ctx.messenger.createMessage(`Boop <@${target.id}>! >.<`);
	}
}
