import { BotOwnerSuppressor } from './BotOwnerSuppressor';
import { ChannelSuppressor } from './ChannelSuppressor';
import { GuildAdminSuppressor } from './GuildAdminSuppressor';
import { GuildOwnerSuppressor } from './GuildOwnerSuppressor';
import { GuildSuppressor } from './GuildSuppressor';
import { RoleSuppressor } from './RoleSuppressor';
import { UserSuppressor } from './UserSuppressor';

export const Suppressors = [
	new BotOwnerSuppressor(),
	new GuildOwnerSuppressor(),
	new GuildAdminSuppressor(),
	new UserSuppressor(),
	new ChannelSuppressor(),
	new RoleSuppressor(),
	new GuildSuppressor(),
];
