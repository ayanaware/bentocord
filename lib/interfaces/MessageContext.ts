export interface MessageContext {
	// Always available
	userId: string;
	channelId: string;

	// Available if in guild
	guildId?: string;
	roleIds?: Array<string>;
}
