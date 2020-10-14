export enum DiscordEvent {
	// shard
	SHARD_READY = 'shardReady', // shardID
	SHARD_RESUME = 'shardResume', // shardID
	SHARD_DISCONNECT = 'shardDisconnect', // error, shardID

	// precenses
	PRESENCE_UPDATE = 'presenceUpdate', // other, oldPresence

	// message
	MESSAGE_CREATE = 'messageCreate', // message
	MESSAGE_DELETE = 'messageDelete', // message if cached, otherwise { id, channel }
	MESSAGE_UPDATE = 'messageUpdate', // message, oldMessage if cached otherwise null

	MESSAGE_DELETE_BULK = 'messageDeleteBulk', // Array<PartialMessage>

	// reactions
	MESSAGE_REACTION_ADD = 'messageReactionAdd',
	MESSAGE_REACTION_REMOVE = 'messageReactionRemove',
	MESSAGE_REACTION_REMOVE_ALL = 'messageReactionRemoveAll',

	// guild
	GUILD_CREATE = 'guildCreate', // guild
	GUILD_DELETE = 'guildDelete', // guild
	GUILD_UPDATE = 'guildUpdate', // guild, oldGuild

	GUILD_AVAILABLE = 'guildAvailable', // guild
	GUILD_UNAVAILABLE = 'guildUnavailable', // guild

	GUILD_BAN_ADD = 'guildBanAdd', // guild, user
	GUILD_BAN_REMOVE = 'guildBanRemove', // guild, user

	GUILD_MEMBER_ADD = 'guildMemberAdd', // guild, member
	GUILD_MEMBER_REMOVE = 'guildMemberRemove', // guild, member
	GUILD_MEMBER_UPDATE = 'guildMemberUpdate', // guild, member, oldMember

	GUILD_ROLE_CREATE = 'guildRoleCreate', // guild, role
	GUILD_ROLE_DELETE = 'guildRoleDelete', // guild, role
	GUILD_ROLE_UPDATE = 'guildRoleUpdate', // guild, role, oldRole

	// channel
	CHANNEL_CREATE = 'channelCreate', // channel
	CHANNEL_DELETE = 'channelDelete', // channel
	CHANNEL_UPDATE = 'channelUpdate', // channel, oldChannel

	CHANNEL_PIN_UPDATE = 'channelPinUpdate', // channel, timestamp, oldTimestamp

	// voice
	VOICE_CHANNEL_JOIN = 'voiceChannelJoin',
	VOICE_CHANNEL_LEAVE = 'voiceChannelLeave',
	VOICE_CHANNEL_SWITCH = 'voiceChannelSwitch',
	VOICE_STATE_UPDATE = 'voiceStateUpdate',

	// call
	CALL_CREATE = 'callCreate', // call
	CALL_DELETE = 'callDelete', // call
	CALL_RING = 'callRing', // call
	CALL_UPDATE = 'callUpdate', // call, oldCall

	CHANNEL_RECIPIIENT_ADD = 'channelRecipientAdd', // channel, user
	CHANNEL_RECIPIIENT_REMOVE = 'channelRecipientRemove', // channel, user

	FRIEND_SUGGESTION_CREATE = 'friendSuggestionCreate', // user, reasons
	FRIEND_SUGGESTION_DELETE = 'friendSuggestionDelete', // user, reasons
}