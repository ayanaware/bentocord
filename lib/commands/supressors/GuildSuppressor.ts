import { CommandContext } from '../CommandContext';
import { SuppressorType } from '../constants/SuppressorType';
import { Suppressor, SuppressorOption } from '../interfaces/Suppressor';

export class GuildSuppressor implements Suppressor {
	public suppressor = SuppressorType.GUILD;

	public async suppress(ctx: CommandContext, option: SuppressorOption, guildIds?: Array<string>): Promise<string | false> {
		if (!ctx.guildId) return ctx.formatTranslation('BENTOCORD_SUPPRESSOR_GUILD', {}, 'This command must be executed in a server.');

		if (!Array.isArray(guildIds)) return false;

		const message = await ctx.formatTranslation('BENTOCORD_SUPPRESSOR_GUILD_DENIED', {}, 'Server is not allowed to execute this command.');
		return guildIds.includes(ctx.guildId) ? false : message;
	}
}
