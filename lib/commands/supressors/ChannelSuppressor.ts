import { CommandContext } from '../CommandContext';
import { SuppressorType } from '../constants/SuppressorType';
import { Suppressor, SuppressorOption } from '../interfaces/Suppressor';

export class ChannelSuppressor implements Suppressor {
	public suppressor = SuppressorType.CHANNEL;

	public async suppress(ctx: CommandContext, option: SuppressorOption, channelIds?: Array<string>): Promise<string | false> {
		if (!Array.isArray(channelIds)) return false;

		return channelIds.includes(ctx.channelId) ? false : 'Channel is not a member of list';
	}
}
