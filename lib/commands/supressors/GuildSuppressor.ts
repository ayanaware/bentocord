import { CommandContext } from '../CommandContext';
import { SuppressorType } from '../constants/SuppressorType';
import { Suppressor, SuppressorOption } from '../interfaces/Suppressor';

export class GuildSuppressor implements Suppressor {
	public suppressor = SuppressorType.GUILD;

	public async suppress(ctx: CommandContext, option: SuppressorOption, guildIds?: Array<string>): Promise<string | false> {
		if (!ctx.guildId) return 'This command must be ran in a server';

		if (!Array.isArray(guildIds)) return false;

		return guildIds.includes(ctx.guildId) ? false : 'server is not allowed to run this command';
	}
}
