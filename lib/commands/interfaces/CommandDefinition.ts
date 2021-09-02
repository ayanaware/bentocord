import { DiscordPermission } from '../../discord/constants/DiscordPermission';
import { CommandContext } from '../CommandContext';

import { AnyCommandOption } from './CommandOption';
import type { SuppressorDefinition } from './Suppressor';

export interface CommandDefinition {
	/** Command Aliases; First will be used for slash command name */
	aliases: Array<string>;
	/** Command Description */
	description: string;

	/** Command Options */
	options?: Array<AnyCommandOption>;

	/** Discord Permissions this command requires */
	selfPermissions?: Array<DiscordPermission>;

	/** Should this command be registered as a slash command? */
	registerSlash?: boolean | undefined;

	/** Disable execution via message w/ prefix */
	disablePrefix?: boolean;

	/** Suppressors */
	suppressors?: Array<SuppressorDefinition>;

	/** Function name or implementation to execute */
	execute?: string | ((ctx?: CommandContext) => Promise<any>);
}
