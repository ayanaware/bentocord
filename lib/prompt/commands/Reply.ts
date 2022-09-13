import { ComponentAPI, Inject } from '@ayanaware/bento';

import { AnyCommandContext, InteractionCommandContext } from '../../commands/CommandContext';
import { CommandManager } from '../../commands/CommandManager';
import { OptionType } from '../../commands/constants/OptionType';
import { CommandDefinition } from '../../commands/interfaces/CommandDefinition';
import { CommandEntity } from '../../commands/interfaces/entity/CommandEntity';
import { PromptManager } from '../PromptManager';

export class ReplyCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:ReplyCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;

	@Inject() private readonly pm: PromptManager;

	public definition: CommandDefinition = {
		name: ['r', 'reply'],
		description: 'Reply to a pending prompt',
		options: [
			{ type: OptionType.STRING, name: 'response', description: 'Response', rest: true },
		],
	};

	public async execute(ctx: AnyCommandContext, { response }: { response: string }): Promise<unknown> {
		if (ctx instanceof InteractionCommandContext) {
			try {
				await ctx.deleteExecutionMessage();
			} catch { /* Failed */}
		}

		return this.pm.handleResponse(ctx.channelId, ctx.userId, response);
	}
}
