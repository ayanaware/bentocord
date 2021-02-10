import { CommandContext } from '../commands';
import { InhibitorType } from './constants';
import { Inhibitor, InhibitorFn } from './interfaces';

const inhibitors: Array<Inhibitor> = [];
const add = (inhibitor: InhibitorType, execute: InhibitorFn) => inhibitors.push({ inhibitor, execute });

add(InhibitorType.BOT_OWNER, (ctx: CommandContext) => {
	return ctx.isOwner() === true ? false : 'User is not a bot owner';
});

add(InhibitorType.CHANNEL, (ctx: CommandContext, channelIds?: Array<string>) => {
	if (!Array.isArray(channelIds)) return false;

	return channelIds.includes(ctx.channelId) ? false : 'Channel not in list';
});

add(InhibitorType.USER, (ctx: CommandContext, userIds?: Array<string>) => {
	if (!Array.isArray(userIds)) return false;

	return userIds.includes(ctx.authorId) ? false : 'User not in list';
});

add(InhibitorType.GUILD, (ctx: CommandContext) => {
	return ctx.guild !== null ? false : 'No guild found';
});

add(InhibitorType.GUILD_OWNER, (ctx: CommandContext) => {
	if (!ctx.guild) return true;

	return ctx.guild.ownerID === ctx.authorId ? false : 'User is not guild owner';
});

add(InhibitorType.GUILD_ADMIN, (ctx: CommandContext) => {
	if (!ctx.guild) return true;
	if (!ctx.member) return true;
	const member = ctx.member;

	return member.permissions.has('administrator') ? false : 'User is not a guild Administrator';
});

add(InhibitorType.GUILD_ROLE, (ctx: CommandContext, roleIds?: Array<string>, all?: boolean) => {
	if (!ctx.member) return true;
	const member = ctx.member;

	if (!Array.isArray(roleIds)) return false;

	if (all) return roleIds.every(roleId => member.roles.includes(roleId)) ? false : 'User does not have all roles in list';
	return roleIds.some(roleId => member.roles.includes(roleId)) ? false : 'User does not have any roles in the list';
});


export default inhibitors;
