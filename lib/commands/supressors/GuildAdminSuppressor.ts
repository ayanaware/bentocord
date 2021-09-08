import { CommandContext } from '../CommandContext';
import { SuppressorType } from '../constants/SuppressorType';
import { Suppressor } from '../interfaces/Suppressor';

export class GuildAdminSuppressor implements Suppressor {
	public suppressor = SuppressorType.GUILD_ADMIN;

	public async suppress(ctx: CommandContext): Promise<string | false> {
		const member = ctx.member;
		if (!member) return false;

		return member.permissions.has('administrator') ? false : 'You lack the required permission';
	}
}
