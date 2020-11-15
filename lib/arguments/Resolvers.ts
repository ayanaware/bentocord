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
		if (choices.some(c => c.toLowerCase() === phrase.toLowerCase())) return phrase;

		return null;
	}

	return phrase;
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

		if (choicePhrases.length > 0) return choicePhrases;

		return null;
	}

	return phrases;
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

	return number;
});

add(ArgumentType.NUMBERS, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	const numberResolver = resolvers.find(r => r.type === ArgumentType.NUMBER);

	return phrases.map(phrase => numberResolver.fn(ctx, arg, [phrase]));
});

// BOOLEAN & BOOLEANS
add(ArgumentType.BOOLEAN, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	const phrase = phrases.join(' ');

	const findTrue = phrase.match(/^(true|yes|y|1)$/);
	if (findTrue) return true;

	const findFalse = phrase.match(/^(false|no|n|0)$/);
	if (findFalse) return false;

	return null;
});

add(ArgumentType.BOOLEANS, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	const booleanResolver = resolvers.find(r => r.type === ArgumentType.BOOLEAN);

	return phrases.map(phrase => booleanResolver.fn(ctx, arg, [phrase]));
})

// USER & USERS
add(ArgumentType.USER, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	const phrase = phrases.join(' ');
	return ctx.discord.client.users.get(phrase) || ctx.discord.client.users.find(u => checkUser(phrase, u));
});

add(ArgumentType.USERS, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	return ctx.discord.client.users.filter(u => phrases.some(p => checkUser(p, u)));
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
	if (!ctx.guild) return null;

	const phrase = phrases.join(' ');

	return ctx.guild.members.get(phrase) || ctx.guild.members.find(m => checkMember(phrase, m));
});

add(ArgumentType.MEMBERS, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	if (!ctx.guild) return null;

	return ctx.guild.members.filter(m => phrases.some(p => checkMember(p, m)));
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
	if (!ctx.guild) return null;

	const phrase = phrases.join(' ');

	return ctx.guild.channels.get(phrase) || ctx.guild.channels.find(c => checkChannel(phrase, c));
});

add(ArgumentType.CHANNELS, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	if (!ctx.guild) return null;

	return ctx.guild.channels.filter(c => phrases.some(p => checkChannel(p, c)));
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
	if (!ctx.guild) return null;

	const phrase = phrases.join(' ');

	return ctx.guild.roles.get(phrase) || ctx.guild.roles.find(r => checkRole(phrase, r));
});

add(ArgumentType.ROLES, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	if (!ctx.guild) return null;

	return ctx.guild.roles.filter(r => phrases.some(p => checkRole(p, r)));
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
	if (!ctx.guild) return null;

	const phrase = phrases.join(' ');

	return ctx.guild.emojis.find(e => checkEmoji(phrase, e));
});

add(ArgumentType.EMOJIS, (ctx: CommandContext, arg: Argument, phrases: Array<string>) => {
	if (!ctx.guild) return null;

	return ctx.guild.emojis.filter(e => phrases.some(p => checkEmoji(p, e)));
});

function checkEmoji(phrase: string, emoji: Emoji) {
	if (emoji.id === phrase) return true;

	// handle usage
	const match = phrase.match(/^<a?:([^\s]+):(\d{17,19})>$/)
	if (match && emoji.name === match[1]) return true;
	if (match && emoji.id === match[2]) return true;

	// handle name
	phrase = phrase.replace(/:/g, '');

	return emoji.name.toLowerCase().includes(phrase.toLowerCase());
}

export default resolvers;
