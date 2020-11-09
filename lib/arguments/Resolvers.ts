import { AnyGuildChannel, Channel, Member, Role, TextableChannel, TextChannel, User, VoiceChannel } from 'eris';
import { CommandContext } from '../commands';

import { ArgumentType } from './constants';
import { Resolver } from './interfaces';

const resolvers: Array<Resolver<any>> = [];
const add = (type: ArgumentType, fn: (ctx: CommandContext, phrase: string) => any | Promise<any>) => resolvers.push({ type, fn });

add(ArgumentType.STRING, (ctx: CommandContext, phrase: string) => {
	if (!phrase) return null;
	
	return phrase;
});

add(ArgumentType.NUMBER, (ctx: CommandContext, phrase: string) => {
	if (!phrase) return null;

	const number = parseInt(phrase);
	if (Number.isNaN(number)) return null;

	return number;
});

add(ArgumentType.BOOLEAN, (ctx: CommandContext, phrase: string) => {
	if (!phrase) return null;

	const findTrue = phrase.match(/^true|yes|1$/);
	if (findTrue) return true;

	const findFalse = phrase.match(/^false|no|0$/);
	if (findFalse) return false;

	return null;
});

add(ArgumentType.USER, (ctx: CommandContext, phrase: string) => {
	return ctx.discord.client.users.get(phrase) || ctx.discord.client.users.find(u => checkUser(phrase, u));
});

add(ArgumentType.USERS, (ctx: CommandContext, phrase: string) => {
	return ctx.discord.client.users.filter(u => checkUser(phrase, u));
});

function checkUser(phrase: string, user: User | Member) {
	if (user.id === phrase) return true;

	// handle mention
	const id = phrase.match(/^<@!?(\d{17,19})>$/i);
	if (id && user.id === id[1]) return true;

	// handle username
	const match = phrase.match(/([^#]+)#?(\d{4})?/i);
	const username = match[1];
	const discrim = match[2] || null;

	if (user.username.toLowerCase().includes(username.toLowerCase())) {
		if (discrim) return user.discriminator === discrim;
		return true;
	}

	return false;
}

add(ArgumentType.MEMBER, (ctx: CommandContext, phrase: string) => {
	if (!ctx.guild) return null;

	return ctx.guild.members.get(phrase) || ctx.guild.members.find(m => checkMember(phrase, m));
});

add(ArgumentType.MEMBERS, (ctx: CommandContext, phrase: string) => {
	if (!ctx.guild) return null;

	return ctx.guild.members.filter(m => checkMember(phrase, m));
});

function checkMember(phrase: string, member: Member) {
	if (checkUser(phrase, member)) return true;

	// handle displayname
	if (member.nick && member.nick.toLowerCase().includes(phrase.toLowerCase())) return true;

	return false;
}

add(ArgumentType.RELEVANT, (ctx: CommandContext, phrase: string) => {
	const userResolver = resolvers.find(r => r.type === ArgumentType.USER);
	const memberResolver = resolvers.find(r => r.type === ArgumentType.MEMBER);
	if (ctx.guild) return memberResolver.fn(ctx, phrase);
	return userResolver.fn(ctx, phrase);
});

add(ArgumentType.RELEVANTS, (ctx: CommandContext, phrase: string) => {
	const usersResolver = resolvers.find(r => r.type === ArgumentType.USERS);
	const membersResolver = resolvers.find(r => r.type === ArgumentType.MEMBERS);
	if (ctx.guild) return membersResolver.fn(ctx, phrase);
	return usersResolver.fn(ctx, phrase);
});

add(ArgumentType.CHANNEL, (ctx: CommandContext, phrase: string) => {
	if (!ctx.guild) return null;

	return ctx.guild.channels.get(phrase) || ctx.guild.channels.find(c => checkChannel(phrase, c));
});

add(ArgumentType.CHANNELS, (ctx: CommandContext, phrase: string) => {
	if (!ctx.guild) return null;

	return ctx.guild.channels.filter(c => checkChannel(phrase, c));
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

add(ArgumentType.ROLE, (ctx: CommandContext, phrase: string) => {
	if (!ctx.guild) return null;

	return ctx.guild.roles.get(phrase) || ctx.guild.roles.find(r => checkRole(phrase, r));
});

add(ArgumentType.ROLES, (ctx: CommandContext, phrase: string) => {
	if (!ctx.guild) return null;

	return ctx.guild.roles.filter(r => checkRole(phrase, r));
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

export default resolvers;
