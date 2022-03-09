import { CommandContext } from '../CommandContext';
import { SuppressorType } from '../constants/SuppressorType';
import { Suppressor, SuppressorOption } from '../interfaces/Suppressor';

export class BotOwnerSuppressor implements Suppressor {
	public suppressor = SuppressorType.BOT_OWNER;

	public async suppress(ctx: CommandContext, option: SuppressorOption): Promise<string | false> {
		const message = await ctx.formatTranslation('BENTOCORD_SUPPRESSOR_BOT_OWNER') || 'You are not a bot owner.';
		return (await ctx.isBotOwner()) ? false : message;
	}
}
