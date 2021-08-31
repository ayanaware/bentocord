
export const API_VERSION = 9;
export const API_URL = 'https://discord.com';
export const API_PREFIX = `/api/v${API_VERSION}`;

export const INTERACTION_VERSION = 1;

export const APPLICATION_COMMANDS = (appId: string): string => `/applications/${appId}/commands`;
export const APPLICATION_COMMAND = (appId: string, commandId: string): string => `/applications/${appId}/commands/${commandId}`;

export const APPLICATION_GUILD_COMMANDS = (appId: string, guildId: string): string => `/applications/${appId}/guilds/${guildId}/commands`;
export const APPLICATION_GUILD_COMMAND = (appId: string, guildId: string, commandId: string): string => `/applications/${appId}/guilds/${guildId}/commands/${commandId}`;

export const INTERACTION_RESPONSE = (interactionId: string, token: string): string => `/interactions/${interactionId}/${token}/callback`;
export const INTERACTION_MESSAGE = (appId: string, token: string, messageId?: string): string => `/webhooks/${appId}/${token}${messageId ? `/messages/${messageId}` : ''}`;
