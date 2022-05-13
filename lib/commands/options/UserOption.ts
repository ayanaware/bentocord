import { Collection, Constants, Member, User } from 'eris';

import { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import type { CommandOptionValue } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export type OptionUser = CommandOptionValue<OptionType.USER, User | Member>;

export class UserOptionResolver implements Resolver<User|Member> {
	public option = OptionType.USER;
	public convert = Constants.ApplicationCommandOptionTypes.USER;

	public async reduce(ctx: CommandContext, option: OptionUser, user: User | Member): Promise<{ display: string, extra?: string }> {
		let display = `${user.username}#${user.discriminator}`;
		if ((user as Member).nick) display = `${(user as Member).nick} (${display})`;

		return { display, extra: user.id };
	}

	public async resolve(ctx: CommandContext, option: OptionUser, input: string): Promise<Array<User|Member>> {
		const client = ctx.discord.client;

		// TODO: Possibly limit this to just self & user who is executing command
		let users: Collection<User|Member> = client.users;
		if (ctx.guild) users = ctx.guild.members;

		const filter = Array.from(users.filter(u => this.matchUser(input, u)).values());
		if (filter.length > 0) return filter;

		return Array.from(users.values());
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

		if (user.username.toLocaleLowerCase().includes(username.toLocaleLowerCase())) {
			if (discrim) return user.discriminator === discrim;
			return true;
		}
	}
}
