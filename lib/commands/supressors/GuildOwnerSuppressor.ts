import { CommandContext } from '../CommandContext';
import { SuppressorType } from '../constants/SuppressorType';
import { Suppressor } from '../interfaces/Suppressor';

export class GuildOwnerSuppressor implements Suppressor {
	public suppressor = SuppressorType.GUILD_OWNER;

	public async suppress(ctx: CommandContext): Promise<string | false> {
		const guild = ctx.guild;
		if (!guild) return false;

		return guild.ownerID === ctx.authorId ? false : 'You lack the required permission';
	}
}
