import { Constants } from 'eris';

// Common channel types helper
export const AllTextChannelTypes = [
	Constants.ChannelTypes.GUILD_TEXT,
	Constants.ChannelTypes.GUILD_VOICE,
	Constants.ChannelTypes.DM,
	Constants.ChannelTypes.GROUP_DM,
	Constants.ChannelTypes.GUILD_NEWS,
	Constants.ChannelTypes.GUILD_STORE,
	Constants.ChannelTypes.GUILD_NEWS_THREAD,
	Constants.ChannelTypes.GUILD_PUBLIC_THREAD,
	Constants.ChannelTypes.GUILD_PRIVATE_THREAD,
];

export const AllVoiceChannelTypes = [
	Constants.ChannelTypes.GUILD_VOICE,
	Constants.ChannelTypes.GUILD_STAGE_VOICE,
];
