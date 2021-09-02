import { CommandContext } from '../CommandContext';
import { SuppressorType } from '../constants/SuppressorType';
import { Suppressor, SuppressorOption } from '../interfaces/Suppressor';

export class BotOwnerSuppressor implements Suppressor {
	public suppressor = SuppressorType.BOT_OWNER;

	public async suppress(ctx: CommandContext, option: SuppressorOption): Promise<string | false> {
		return (await ctx.isOwner()) ? false : 'You lack the required permission';
	}
}
