import { CommandContext } from '../CommandContext';
import { SuppressorType } from '../constants/SuppressorType';
import { Suppressor } from '../interfaces/Suppressor';

export class GuildOwnerSuppressor implements Suppressor {
	public suppressor = SuppressorType.GUILD_OWNER;

	public async suppress(ctx: CommandContext): Promise<string | false> {
		const guild = ctx.guild;
		if (!guild) return false;

		const message = await ctx.getTranslation('BENTOCORD_SUPPRESSOR_GUILD_OWNER') || 'You are not the server owner.';
		return guild.ownerID === ctx.authorId ? false : message;
	}
}
