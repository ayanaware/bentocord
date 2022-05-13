import { CommandContext } from '../CommandContext';
import { SuppressorType } from '../constants/SuppressorType';
import { Suppressor, SuppressorOption } from '../interfaces/Suppressor';

export class DMSuppressor implements Suppressor {
	public suppressor = SuppressorType.DM;

	public async suppress(ctx: CommandContext, option: SuppressorOption): Promise<string | false> {
		if (ctx.guildId) return ctx.formatTranslation('BENTOCORD_SUPPRESSOR_DM', {}, 'This command must be executed in a Direct Message.');

		return false;
	}
}
