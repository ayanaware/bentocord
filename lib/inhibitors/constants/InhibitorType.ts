export type InhibitorName = string | InhibitorType;

export enum InhibitorType {
	BOT_OWNER = 'BOT_OWNER',

	CHANNEL = 'CHANNEL', // channelIds: Array<string>
	USER = 'USER', // userIds: Array<string>

	GUILD = 'GUILD',
	GUILD_OWNER = 'GUILD_OWNER',
	GUILD_ADMIN = 'GUILD_ADMIN',

	GUILD_ROLE = 'GUILD_ROLE', // roleIds: Array<string>, all: boolean
}
