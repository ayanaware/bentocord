import { BigIntegerOptionResolver } from './BigIntegerOption';
import { BooleanOptionResolver } from './BooleanOption';
import { ChannelOptionResolver } from './ChannelOption';
import { EmojiOptionResolver } from './EmojiOption';
import { GuildOptionResolver } from './GuildOption';
import { IntegerOptionResolver } from './IntegerOption';
import { NumberOptionResolver } from './NumberOption';
import { RoleOptionResolver } from './RoleOption';
import { StringOptionResolver } from './StringOption';
import { UserOptionResolver } from './UserOption';

export const Resolvers = [
	new BooleanOptionResolver(),
	new IntegerOptionResolver(),
	new StringOptionResolver(),

	new NumberOptionResolver(),
	new BigIntegerOptionResolver(),

	new UserOptionResolver(),
	new ChannelOptionResolver(),
	new RoleOptionResolver(),
	new EmojiOptionResolver(),
	new GuildOptionResolver(),
];
