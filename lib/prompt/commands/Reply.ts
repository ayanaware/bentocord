import { ComponentAPI, Inject } from '@ayanaware/bento';

import { InteractionCommandContext, MessageCommandContext } from '../../commands/CommandContext';
import { CommandManager } from '../../commands/CommandManager';
import { OptionType } from '../../commands/constants/OptionType';
import { CommandDefinition } from '../../commands/interfaces/CommandDefinition';
import { CommandEntity } from '../../commands/interfaces/entity/CommandEntity';
import { PromptManager } from '../PromptManager';

export class ReplyCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:ReplyCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;

	@Inject() private readonly promptManager: PromptManager;

	public definition: CommandDefinition = {
		aliases: ['r', 'reply'],
		description: 'Reply to a pening prompt',
		options: [
			{ type: OptionType.STRING, name: 'response', rest: true },
		],
	};

	public async execute(ctx: InteractionCommandContext | MessageCommandContext, { response }: { response: string }): Promise<unknown> {
		try {
			if (ctx.type === 'interaction') await ctx.acknowledge();
			else if (ctx.type === 'message' && ctx.message) await ctx.message.delete();

			await ctx.deleteResponse();
		} catch { /* Failed */}

		return this.promptManager.handleResponse(ctx.channelId, ctx.authorId, response);
	}
}
