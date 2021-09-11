import { CommandContext } from '../CommandContext';
import { SuppressorType } from '../constants/SuppressorType';
import { Suppressor, SuppressorOption } from '../interfaces/Suppressor';

export class ChannelSuppressor implements Suppressor {
	public suppressor = SuppressorType.CHANNEL;

	public async suppress(ctx: CommandContext, option: SuppressorOption, channelIds?: Array<string>): Promise<string | false> {
		if (!Array.isArray(channelIds)) return false;

		const message = await ctx.getTranslation('BENTOCORD_SUPPRESSOR_CHANNEL') || 'Channel is not allowed to execute this command.';
		return channelIds.includes(ctx.channelId) ? false : message;
	}
}
