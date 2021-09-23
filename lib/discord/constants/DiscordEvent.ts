/**
 * Maps to Eris camelCase Event names
 * https://abal.moe/Eris/docs/Client#event-callCreate
 */
export enum DiscordEvent {
	// ERIS

	/**
	 * Eris: Fired when a shard establishes a connection
	 * @param shardId number
	 */
	CONNECT = 'connect',
	/**
	 * Eris: Fired when all shards disconnect
	 */
	DISCONNECT = 'disconnect',
	/**
	 * Eris: Fired when all shards turn ready
	 */
	READY = 'ready',
	/**
	 * Eris: Fired when a shard recieves an OP: 10 packet
	 * @param trace Discord Trace Array
	 * @param shardId number
	 */
	HELLO = 'hello',

	/**
	 * Eris: Fired when a shard has extra debug info
	 * @param message string
	 * @param shardId number
	 */
	DEBUG = 'debug',
	/**
	 * Eris: Fired when a shard encounters an error
	 * @param error Error
	 * @param shardId number
	 */
	ERROR = 'error',
	/**
	 * Eris: Fired when something weird but non-breaking happened to a shard
	 * @param message string
	 * @param shardId number
	 */
	WARN = 'warn',
	/**
	 * Eris: Fired when the shard encounters an unknown packet
	 * @param packet DiscordPacket
	 * @param shardId number
	 */
	UNKNOWN = 'unknown',

	/**
	 * Eris: Fired when
	 * @param packet DiscordPacket
	 * @param shardId number
	 */
	RAW_WS = 'rawWS', // packet, shardId
	/**
	 * Eris: Fired when the Client's RequestHandler recieves a response
	 * @param request Request data object
	 * @see https://abal.moe/Eris/docs/Client#event-rawREST
	 */
	RAW_REST = 'rawREST',

	// SHARD STATUS

	/**
	 * Fired when a shard turns ready
	 * @param shardId number
	 */
	SHARD_READY = 'shardReady',
	/**
	 * Fired when a shard resumes
	 * @param shardId number
	 */
	SHARD_RESUME = 'shardResume',
	/**
	 * Fired when a shard disconnects
	 * @param error Error?
	 * @param shardId number
	 */
	SHARD_DISCONNECT = 'shardDisconnect',

	/**
	 * Eris: Fired when a shard finishes processing ready packet
	 * @param shardId number
	 */
	SHARD_PRE_READY = 'shardPreReady',

	// CHANNEL

	/**
	 * Fired when a channel is created
	 * @param channel AnyChannel
	 */
	CHANNEL_CREATE = 'channelCreate',
	/**
	 * Fired when a channel is deleted
	 * @param channel AnyChannel
	 */
	CHANNEL_DELETE = 'channelDelete',
	/**
	 * Fired when a channel is updated
	 * @param channel AnyChannel
	 * @param oldChannel Partial AnyChannel
	 */
	CHANNEL_UPDATE = 'channelUpdate',

	/**
	 * Fired when a channel pin timestamp is updated
	 * @param channel AnyChannel
	 * @param timestamp number
	 * @param oldTimestamp number
	 */
	CHANNEL_PIN_UPDATE = 'channelPinUpdate',

	/**
	 * Fired when a user joins a group channel
	 * @param channel GroupChannel
	 * @param user User
	 */
	CHANNEL_RECIPIENT_ADD = 'channelRecipientAdd',
	/**
	 * Fired when a user leaves a group channel
	 * @param channel GroupChannel
	 * @param user User
	 */
	CHANNEL_RECIPIENT_REMOVE = 'channelRecipientRemove',

	// GUILD

	/**
	 * Fired when a guild becomes available
	 * @param guild Guild
	 */
	GUILD_AVAILABLE = 'guildAvailable',
	/**
	 * Fired when a guild becomes unavilable
	 * @param guild Partial Guild
	 */
	GUILD_UNAVAILABLE = 'unavailableGuildCreate',

	/**
	 * Fired when a guild is created, aka client joins a guild
	 * @param guild Guild
	 */
	GUILD_CREATE = 'guildCreate',
	/**
	 * Fired when a guild is deleted, aka client left, client kicked/banned, or guild actually deleted
	 * @param guild Partial Guild
	 */
	GUILD_DELETE = 'guildDelete',
	/**
	 * Fired when a guild is updated
	 * @param guild Guild
	 * @param oldGuild Partial Guild
	 */
	GUILD_UPDATE = 'guildUpdate',

	/**
	 * Fired when a user is banned from a guild
	 * @param guild Guild
	 * @param user User
	 */
	GUILD_BAN_ADD = 'guildBanAdd',
	/**
	 * Fired when a user is unbanned from a guild
	 * @param guild Guild
	 * @param user User
	 */
	GUILD_BAN_REMOVE = 'guildBanRemove',

	/**
	 * Fired when a guild's emojis are updated
	 * @param guild Guild
	 * @param emojis Emoji Array
	 * @param oldEmojis Partial Emoji Array
	 */
	GUILD_EMOJIS_UPDATE = 'guildEmojisUpdate',

	/**
	 * Fired when a member joins a guild
	 * @param guild Guild
	 * @param member Member
	 */
	GUILD_MEMBER_ADD = 'guildMemberAdd',
	/**
	 * Fired when a member leaves a guild
	 * @param guild Guild
	 * @param member Member
	 */
	GUILD_MEMBER_REMOVE = 'guildMemberRemove',
	/**
	 * Fired when a member is updated (roles change, nickname change, boosting server change)
	 */
	GUILD_MEMBER_UPDATE = 'guildMemberUpdate',

	/**
	 * Fired when a member chunk is recieved from discord
	 * @param guild Guild
	 * @param members Member Array
	 */
	GUILD_MEMBER_CHUNK = 'guildMemberChunk',

	/**
	 * Fired when a guild role is created
	 * @param guild Guild
	 * @param role Role
	 */
	GUILD_ROLE_CREATE = 'guildRoleCreate',
	/**
	 * Fired when a guild role is deleted
	 * @param guild Guild
	 * @param role Partial Role
	 */
	GUILD_ROLE_DELETE = 'guildRoleDelete',
	/**
	 * Fired when a guild role is updated
	 * @param guild Guild
	 * @param role Role
	 * @param oldRole Partial Role
	 */
	GUILD_ROLE_UPDATE = 'guildRoleUpdate',

	/**
	 * Fired when a guild invite is created
	 * @param guild Guild
	 * @param invite Invite
	 */
	INVITE_CREATE = 'inviteCreate',
	/**
	 * Fired when a guild invite is deleted
	 * @param guild Guild
	 * @param invite Invite
	 */
	INVITE_DELETE = 'inviteDelete',

	// MESSAGE

	/**
	 * Fired when a message is created
	 * @param message Message
	 */
	MESSAGE_CREATE = 'messageCreate',
	/**
	 * Fired when a message is deleted
	 * @param message Partial Message
	 */
	MESSAGE_DELETE = 'messageDelete',
	/**
	 * Fired when a message is updated
	 * @param message Message
	 * @param oldMessage Partial Message or null
	 */
	MESSAGE_UPDATE = 'messageUpdate', // message, oldMessage if cached otherwise null
	/**
	 * Fired when a bulk delete occurs
	 * @param messages Partial Message Array
	 */
	MESSAGE_DELETE_BULK = 'messageDeleteBulk',

	/**
	 * Fired when someone adds a reaction to a message
	 * @param message Partial Message
	 * @param emoji Partial Emoji
	 * @param reactor Partial Member
	 */
	MESSAGE_REACTION_ADD = 'messageReactionAdd',
	/**
	 * Fired when someone removes a reaction from a message
	 * @param message Partial Message
	 * @param emoji Partial Emoji
	 * @param userId string
	 */
	MESSAGE_REACTION_REMOVE = 'messageReactionRemove',
	/**
	 * Fired when all reactions are removed from a message
	 * @param message Partial Message
	 */
	MESSAGE_REACTION_REMOVE_ALL = 'messageReactionRemoveAll',
	/**
	 * Fired when all reactions of a single emoji type are removed from a message
	 * @param message Partial Message
	 * @param emoji Partial Emoji
	 */
	MESSAGE_REACTION_REMOVE_EMOJI = 'messageReactionRemoveEmoji',

	// PRESENCE & USER UPDATE

	/**
	 * Fired when a guild member or relationship status or game changes
	 * @param other Member or Relationship
	 * @param oldPresence Partial Presence
	 */
	PRESENCE_UPDATE = 'presenceUpdate',

	/**
	 * Fired when a user is updated (username, avatar, or discriminator changes)
	 * @param user User
	 * @param oldUser Partial User
	 */
	USER_UPDATE = 'userUpdate',

	// VOICE

	/**
	 * Fired when a guild member joins a voice channel
	 * @param member Member
	 * @param channel VoiceChannel or StageChannel
	 */
	VOICE_CHANNEL_JOIN = 'voiceChannelJoin',
	/**
	 * Fired when a guild member leaves a voice channel
	 * @param member Member
	 * @param channel VoiceChannel or StageChannel
	 */
	VOICE_CHANNEL_LEAVE = 'voiceChannelLeave',
	/**
	 * Fired when a guild member switches voice channels
	 * @param member Member
	 * @param channel VoiceChannel or StageChannel
	 * @param oldChannel voiceChannel or StageChannel
	 */
	VOICE_CHANNEL_SWITCH = 'voiceChannelSwitch',
	/**
	 * Fired when a guild member's voice state changes
	 * @param member Member
	 * @param oldState VoiceState
	 */
	VOICE_STATE_UPDATE = 'voiceStateUpdate',

	// WEBHOOK

	/**
	 * Fired when a channel's webhooks are updated
	 * @param data object containing channelID and/or guildID
	 */
	WEBHOOKS_UPDATE = 'webhooksUpdate',

	// The following events are not supported as I dont want to help selfbot authors
	// callCreate, callDelete, callRing, callUpdate
	// friendSuggestionCreate, friendSuggestionDelete
}
