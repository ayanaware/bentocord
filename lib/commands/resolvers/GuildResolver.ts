import { ApplicationCommandOptionType } from 'discord-api-types';
import { Guild } from 'eris';

import { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import { CommandOption } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export class GuildResolver implements Resolver<Guild> {
	public option = OptionType.GUILD;
	public convert = ApplicationCommandOptionType.String;

	public async reduce?(ctx: CommandContext, option: CommandOption<Guild>, guild: Guild): Promise<{ display: string, extra?: string }> {
		return { display: guild.name, extra: guild.id };
	}

	public async resolve(ctx: CommandContext, option: CommandOption<Guild>, input: string): Promise<Array<Guild>> {
		const client = ctx.discord.client;

		const guilds = client.guilds;

		return Array.from(guilds.filter(g => this.checkGuild(input, g)).values());
	}

	private checkGuild(input: string, guild: Guild) {
		if (guild.id === input) return true;

		// handle name
		return guild.name.toLocaleLowerCase().includes(input.toLocaleLowerCase());
	}
}
