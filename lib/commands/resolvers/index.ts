import { BooleanResolver } from './BooleanResolver';
import { ChannelResolver } from './ChannelResolver';
import { EmojiResolver } from './EmojiResolver';
import { GuildResolver } from './GuildResolver';
import { NumberResolver } from './NumberResolver';
import { RoleResolver } from './RoleResolver';
import { StringResolver } from './StringResolver';
import { UserResolver } from './UserResolver';

export const Resolvers = [
	new StringResolver(), new NumberResolver(), new BooleanResolver(),
	new UserResolver(), new ChannelResolver(), new RoleResolver(),
	new GuildResolver(),
	new EmojiResolver(),
];
