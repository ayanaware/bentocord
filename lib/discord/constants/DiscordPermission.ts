/**
 * Maps to Eris camelCase permission names
 * https://abal.moe/Eris/docs/reference
 */
export enum DiscordPermission {
	CREATE_INSTANCE_INVITE = 'createInstantInvite',

	KICK_MEMBERS = 'kickMembers',
	BAN_MEMBERS = 'banMembers',

	ADMINISTRATOR = 'administrator',

	MANAGE_CHANNELS = 'manageChannels',
	MANAGE_GUILD = 'manageGuild',

	ADD_REACTIONS = 'addReactions',
	VIEW_AUDIT_LOGS = 'viewAuditLogs',
	VOICE_PRIORITY_SPEAKER = 'voicePrioritySpeaker',

	STREAM = 'stream',

	READ_MESSAGES = 'readMessages',
	SEND_MESSAGES = 'sendMessages',
	SEND_TTS_MESSAGES = 'sendTTSMessages',
	MANAGE_MESSAGES = 'manageMessages',
	EMBED_LINKS = 'embedLinks',
	ATTACH_FILES = 'attachFiles',
	READ_MESSAGE_HISTORY = 'readMessageHistory',
	MENTION_EVERYONE = 'mentionEveryone',
	EXTERNAL_EMOJIS = 'externalEmojis',
	VIEW_GUILD_INSIGHTS = 'viewGuildInsights',

	VOICE_CONNECT = 'voiceConnect',
	VOICE_SPEAK = 'voiceSpeak',
	VOICE_MUTE_MEMBERS = 'voiceMuteMembers',
	VOICE_DEFAN_MEMBERS = 'voiceDeafenMembers',
	VOICE_MOVE_MEMBERS = 'voiceMoveMembers',
	VOICE_USE_VAD = 'voiceUseVAD',

	CHANGE_NICKNAME = 'changeNickname',

	MANAGE_NICKNAMES = 'manageNicknames',
	MANAGE_ROLES = 'manageRoles',
	MANAGE_WEBHOOKS = 'manageWebhooks',
	MANAGE_EMOJIS = 'manageEmojis',

	ALL = 'all',
	ALL_GUILD = 'allGuild',
	ALL_TEXT = 'allText',
	ALL_VOICE = 'allVoice',
}
