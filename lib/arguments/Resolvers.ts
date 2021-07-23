import { AnyGuildChannel, Emoji, Member, Role, User } from 'eris';

import { CommandContext } from '../commands';
import { isPromise } from '../util';
import { ArgumentType } from './constants';
import { Argument, Resolver, ResolverFn } from './interfaces';

const resolvers: Array<Resolver<any>> = [];
const add = (type: ArgumentType, fn: ResolverFn<any>) => resolvers.push({ type, fn });

// STRING & STRINGS
add(ArgumentType.STRING, async (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	const phrase = phrases.join(' ');

	const choices = await getChoices(ctx, arg);
	if (choices.length > 0) {
		if (choices.some(c => c.toLowerCase() === phrase.toLowerCase())) return { value: phrase };

		return { value: null };
	}

	return { value: phrase };
});

add(ArgumentType.STRINGS, async (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	const choices = await getChoices(ctx, arg);
	if (choices.length > 0) {
		const choicePhrases: Array<string> = [];
		for (const choice of choices) {
			for (const phrase of phrases) {
				if (phrase.toLowerCase() === choice.toLowerCase()) choicePhrases.push(phrase);
			}
		}

		if (choicePhrases.length > 0) return { value: choicePhrases };

		return { value: null };
	}

	return { value: phrases };
})

async function getChoices(ctx: CommandContext, arg: Argument) {
	if (!arg.choices) return [];

	let choices: Array<string>
	if (typeof arg.choices === 'function') {
		let result = arg.choices(ctx, arg);
		if (isPromise(result)) result = await result;

		choices = result as Array<string>;
	} else if (Array.isArray(arg.choices)) choices = arg.choices;

	return choices;
}

// NUMBER & NUMBERS
add(ArgumentType.NUMBER, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	const number = parseInt(phrases.join(' '));
	if (Number.isNaN(number)) return null;

	return { value: number };
});

add(ArgumentType.NUMBERS, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	const numberResolver = resolvers.find(r => r.type === ArgumentType.NUMBER);

	return { value: phrases.map(phrase => numberResolver.fn(ctx, arg, [phrase])) };
});

// BOOLEAN & BOOLEANS
add(ArgumentType.BOOLEAN, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	const phrase = phrases.join(' ');

	const findTrue = phrase.match(/^(true|yes|y|1)$/i);
	if (findTrue) return { value: true };

	const findFalse = phrase.match(/^(false|no|n|0)$/i);
	if (findFalse) return { value: false };

	return null;
});

add(ArgumentType.BOOLEANS, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	const booleanResolver = resolvers.find(r => r.type === ArgumentType.BOOLEAN);

	return { value: phrases.map(phrase => booleanResolver.fn(ctx, arg, [phrase])) };
})

// USER & USERS
add(ArgumentType.USER, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	const phrase = phrases.join(' ');

	const users = ctx.discord.client.users.filter(u => checkUser(phrase, u));

	const reduceDisplay = (u: User) => `${u.username}#${u.discriminator}`;
	const reduceExtra = (u: User) => u.id;

	return { value: users, reduce: true, reduceDisplay, reduceExtra };
});

add(ArgumentType.USERS, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	return { value: ctx.discord.client.users.filter(u => phrases.some(p => checkUser(p, u))) };
});

function checkUser(phrase: string, user: User | Member) {
	if (user.id === phrase) return true;

	// handle mention
	const id = phrase.match(/^<@!?(\d{17,19})>$/i);
	if (id && user.id === id[1]) return true;

	// handle username
	const match = phrase.match(/([^#]+)#?(\d{4})?/i);
	if (!match) return false;

	const username = match[1];
	const discrim = match[2] || null;

	if (user.username.toLowerCase().includes(username.toLowerCase())) {
		if (discrim) return user.discriminator === discrim;
		return true;
	}

	return false;
}

// MEMBER & MEMBERS
add(ArgumentType.MEMBER, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	if (!ctx.guild) return { value: null };

	const phrase = phrases.join(' ');

	const members = ctx.guild.members.filter(m => checkMember(phrase, m));

	const reduceDisplay = (m: Member) => {
		let display = `${m.username}#${m.discriminator}`;
		if (m.nick) display = `${m.nick} (${display})`;

		return display;
	};
	const reduceExtra = (m: Member) => m.id;

	return { value: members, reduce: true, reduceDisplay, reduceExtra };
});

add(ArgumentType.MEMBERS, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	if (!ctx.guild) return { value: null };

	return { value: ctx.guild.members.filter(m => phrases.some(p => checkMember(p, m))) };
});

function checkMember(phrase: string, member: Member) {
	if (checkUser(phrase, member)) return true;

	// handle displayname
	if (member.nick && member.nick.toLowerCase().includes(phrase.toLowerCase())) return true;

	return false;
}

// RELEVANT & RELEVANTS
add(ArgumentType.RELEVANT, (ctx: CommandContext, arg: Argument, phrase: Array<string>) => {
	const userResolver = resolvers.find(r => r.type === ArgumentType.USER);
	const memberResolver = resolvers.find(r => r.type === ArgumentType.MEMBER);

	if (ctx.guild) return memberResolver.fn(ctx, arg, phrase);

	return userResolver.fn(ctx, arg, phrase);
});

add(ArgumentType.RELEVANTS, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	const usersResolver = resolvers.find(r => r.type === ArgumentType.USERS);
	const membersResolver = resolvers.find(r => r.type === ArgumentType.MEMBERS);

	if (ctx.guild) return membersResolver.fn(ctx, arg, phrases);

	return usersResolver.fn(ctx, arg, phrases);
});

// CHANNEL & CHANNELS
add(ArgumentType.CHANNEL, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	if (!ctx.guild) return { value: null };

	const phrase = phrases.join(' ');

	const channels = ctx.guild.channels.filter(c => checkChannel(phrase, c))

	const reduceDisplay = (c: AnyGuildChannel) => `#${c.name}`;
	const reduceExtra = (c: AnyGuildChannel) => c.id;

	return { value: channels, reduce: true, reduceDisplay, reduceExtra };
});

add(ArgumentType.CHANNELS, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	if (!ctx.guild) return { value: null };

	return { value: ctx.guild.channels.filter(c => phrases.some(p => checkChannel(p, c))) };
});

function checkChannel(phrase: string, channel: AnyGuildChannel) {
	if (channel.id === phrase) return true;

	// handle mention	
	const id = phrase.match(/^<#(\d{17,19})>$/i);
	if (id && channel.id === id[1]) return true;

	// handle name
	phrase = phrase.replace(/^#/, '');

	return channel.name.toLowerCase().includes(phrase.toLowerCase());
}

// ROLE & ROLES
add(ArgumentType.ROLE, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	if (!ctx.guild) return { value: null };

	const phrase = phrases.join(' ');

	const roles = ctx.guild.roles.filter(r => checkRole(phrase, r));

	const reduceDisplay = (r: Role) => `@${r.name}`;
	const reduceExtra = (r: Role) => r.id;

	return { value: roles, reduce: true, reduceDisplay, reduceExtra };
});

add(ArgumentType.ROLES, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	if (!ctx.guild) return { value: null };

	return { value: ctx.guild.roles.filter(r => phrases.some(p => checkRole(p, r))) };
});

function checkRole(phrase: string, role: Role) {
	if (role.id === phrase) return true;

	// handle mention	
	const id = phrase.match(/^<@&(\d{17,19})>$/i);
	if (id && role.id === id[1]) return true;

	// handle name
	phrase = phrase.replace(/^@/, '');

	return role.name.toLowerCase().includes(phrase.toLowerCase());
}

// EMOJI & EMOJIS
add(ArgumentType.EMOJI, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	if (!ctx.guild) return { value: null };

	const phrase = phrases.join(' ');

	// guild emoji
	const reduceDisplay = (e: Emoji) => e.name;
	const reduceExtra = (e: Emoji) => e.id;

	const guildEmojis = ctx.guild.emojis.filter(e => checkGuildEmoji(phrase, e));
	if (guildEmojis.length > 0) return { value: guildEmojis, reduce: true, reduceDisplay, reduceExtra };

	// unicode & custom non-guild emoji
	const emoji = extractEmoji(phrase);
	if (emoji) return { value: emoji };

	return { value: null };
});

add(ArgumentType.EMOJIS, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	if (!ctx.guild) return { value: null };

	// guild emojis
	const emojis: Array<Emoji> = ctx.guild.emojis.filter(e => phrases.some(p => checkGuildEmoji(p, e)));
	
	// unicode & custom non-guild emoji
	phrases.map(p => extractEmoji(p)).filter(p => !!p).forEach(p => emojis.push(p));

	return { value: emojis };
});

function extractEmoji(phrase: string): Emoji {
	// unicode
	const unicode = phrase.match(/(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/);
	if (unicode) return { id: null, name: unicode[0], require_colons: false, animated: false } as Emoji;

	// custom
	const custom = phrase.match(/^<(?<a>a)?:(?<name>[a-zA-Z0-9_]+):(?<id>\d{17,19})>$/);
	if (custom) return { id: custom.groups.id, name: custom.groups.name, animated: custom.groups.a === 'a', require_colons: true } as Emoji;

	return null;
}

function checkGuildEmoji(phrase: string, emoji: Emoji) {
	if (emoji.id === phrase) return true;

	// handle usage
	const data = extractEmoji(phrase);
	if (data && data.id === emoji.id) return true;

	// handle name
	phrase = phrase.replace(/:/g, '');

	return emoji.name.toLowerCase().includes(phrase.toLowerCase());
}

export default resolvers;
