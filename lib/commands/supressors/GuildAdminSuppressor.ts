import { AnyCommandContext } from '../CommandContext';
import { SuppressorType } from '../constants/SuppressorType';
import { Suppressor } from '../interfaces/Suppressor';

export class GuildAdminSuppressor implements Suppressor {
	public suppressor = SuppressorType.GUILD_ADMIN;

	public async suppress(ctx: AnyCommandContext): Promise<string | false> {
		const member = ctx.member;
		if (!member) return false;

		const message = await ctx.formatTranslation('BENTOCORD_SUPPRESSOR_GUILD_ADMIN', {}, 'You are not a server administrator.');
		return member.permissions.has('administrator') ? false : message;
	}
}
