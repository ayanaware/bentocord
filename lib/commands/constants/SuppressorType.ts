export enum SuppressorType {
	// Powerful People
	/** Bot Owner */
	BOT_OWNER,
	/** Guild Owner */
	GUILD_OWNER,
	/** Guild Administrator */
	GUILD_ADMIN,

	// Filters
	/** User: userIds[] */
	USER,
	/** Channel: channelIds[] */
	CHANNEL,
	/** Role: roleIds[] */
	ROLE,
	/** Guild: guildIds[] */
	GUILD,

	// Other
	/** DM */
	DM,
}
