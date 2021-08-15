import { isPromise } from 'util/types';

import { AnyGuildChannel, Emoji, Member, Role, User } from 'eris';

import { CommandContext } from '../commands/CommandContext';

import { ArgumentType } from './constants/ArgumentType';
import { Argument } from './interfaces/Argument';
import { Resolver, ResolverFn } from './interfaces/Resolver';

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
});

async function getChoices(ctx: CommandContext, arg: Argument) {
	if (!arg.choices) return [];

	let choices: Array<string>;
	if (typeof arg.choices === 'function') {
		let result = arg.choices(ctx, arg);
		if (isPromise(result)) result = await result as Array<string>;

		choices = result;
	} else if (Array.isArray(arg.choices)) {
		choices = arg.choices;
	}

	return choices;
}

// NUMBER & NUMBERS
add(ArgumentType.NUMBER, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	const value = parseInt(phrases.join(' '), 10);
	if (Number.isNaN(value)) return null;

	return { value };
});

add(ArgumentType.NUMBERS, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	const numberResolver = resolvers.find(r => r.type === ArgumentType.NUMBER);

	return { value: phrases.map(phrase => numberResolver.fn(ctx, arg, [phrase])) };
});

// BOOLEAN & BOOLEANS
add(ArgumentType.BOOLEAN, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	const phrase = phrases.join(' ');

	const findTrue = /^(true|yes|y|1)$/i.exec(phrase);
	if (findTrue) return { value: true };

	const findFalse = /^(false|no|n|0)$/i.exec(phrase);
	if (findFalse) return { value: false };

	return null;
});

add(ArgumentType.BOOLEANS, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	const booleanResolver = resolvers.find(r => r.type === ArgumentType.BOOLEAN);

	return { value: phrases.map(phrase => booleanResolver.fn(ctx, arg, [phrase])) };
});

// USER & USERS
add(ArgumentType.USER, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	const phrase = phrases.join(' ');

	const users = ctx.discord.client.users.filter(u => checkUser(phrase, u));

	const reduceDisplay = (u: User) => `${u.username}#${u.discriminator}`;
	const reduceExtra = (u: User) => u.id;

	return { value: users, reduce: true, reduceDisplay, reduceExtra };
});

add(ArgumentType.USERS, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => (
	{ value: ctx.discord.client.users.filter(u => phrases.some(p => checkUser(p, u))) }
));

function checkUser(phrase: string, user: User | Member) {
	if (user.id === phrase) return true;

	// handle mention
	const id = /^<@!?(\d{17,19})>$/i.exec(phrase);
	if (id && user.id === id[1]) return true;

	// handle username
	const match = /([^#]+)#?(\d{4})?/i.exec(phrase);
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

	const channels = ctx.guild.channels.filter(c => checkChannel(phrase, c));

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
	const id = /^<#(\d{17,19})>$/i.exec(phrase);
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
	const id = /^<@&(\d{17,19})>$/i.exec(phrase);
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
	const unicode = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/.exec(phrase);
	// eslint-disable-next-line @typescript-eslint/naming-convention
	if (unicode) return { id: null, name: unicode[0], require_colons: false, animated: false } as Emoji;

	// custom
	const custom = /^<(?<a>a)?:(?<name>[a-zA-Z0-9_]+):(?<id>\d{17,19})>$/.exec(phrase);
	// eslint-disable-next-line @typescript-eslint/naming-convention
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
