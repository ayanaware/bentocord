import { ApplicationCommandOptionType } from 'discord-api-types';
import { Collection, Member, User } from 'eris';

import { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import { CommandOption } from '../interfaces/CommandOption';
import { OptionResolver } from '../interfaces/OptionResolver';

export class UserResolver implements OptionResolver<User|Member> {
	public option = OptionType.USER;
	public convert = ApplicationCommandOptionType.User;

	public async reduce(ctx: CommandContext, option: CommandOption, user: User | Member): Promise<{ display: string, extra?: string }> {
		let display = `${user.username}#${user.discriminator}`;
		if ((user as Member).nick) display = `${(user as Member).nick} (${display})`;

		return { display, extra: user.id };
	}

	public async resolve(ctx: CommandContext, option: CommandOption<User|Member>, input: string): Promise<Array<User|Member>> {
		const client = ctx.discord.client;

		// TODO: Possibly limit this to just self & user who is executing command
		let users: Collection<User|Member> = client.users;
		if (ctx.guild) users = ctx.guild.members;

		return Array.from(users.filter(u => this.matchUser(input, u)).values());
	}

	private matchUser(input: string, user: User | Member) {
		if (user.id === input) return true;

		// handle mention
		const id = /^<@!?(\d{17,19})>$/.exec(input);
		if (id && id[1] === user.id) return true;

		// handle username
		const match = /^([^#]+)#?(\d{4})?$/i.exec(input);

		const username = match[1];
		const discrim = match[2] || null;

		if (user.username.toLowerCase().includes(username.toLowerCase())) {
			if (discrim) return user.discriminator === discrim;
			return true;
		}
	}
}
