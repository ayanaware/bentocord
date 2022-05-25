import { Collection, Constants, Member, User } from 'eris';

import { AnyCommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import type { CommandOptionValue } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export type OptionUser = CommandOptionValue<OptionType.USER, User | Member>;

export class UserOptionResolver implements Resolver<User|Member> {
	public option = OptionType.USER;
	public convert = Constants.ApplicationCommandOptionTypes.USER;

	public async reduce(ctx: AnyCommandContext, option: OptionUser, user: User | Member): Promise<{ display: string, extra?: string }> {
		let display = `${user.username}#${user.discriminator}`;
		if ((user as Member).nick) display = `${(user as Member).nick} (${display})`;

		return { display, extra: user.id };
	}

	public async resolve(ctx: AnyCommandContext, option: OptionUser, input: string): Promise<Array<User|Member>> {
		const client = ctx.discord.client;

		// Limit to author and self if no guild
		let users: Array<User|Member> = [ctx.author, ctx.self];
		if (ctx.guild) users = Array.from(ctx.guild.members.values());

		const filter = users.filter(u => this.matchUser(input, u));
		if (filter.length > 0) return filter;

		return users;
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

		// handle nickname
		if ('nick' in user) {
			if (user.nick && user.nick.toLocaleLowerCase().includes(input.toLocaleLowerCase())) return true;
		}

		return false;
	}
}
