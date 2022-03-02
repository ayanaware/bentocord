import type { DiscordPermission } from '../../discord/constants/DiscordPermission';
import { Translateable } from '../../interfaces/Translateable';
import type { CommandContext } from '../CommandContext';

import type { AnyCommandOption } from './CommandOption';
import type { SuppressorDefinition } from './Suppressor';

export interface CommandDefinition {
	/** Command Aliases; First will be used for slash command name */
	aliases: Array<string>;

	/** Command Description */
	description: string | Translateable;

	/** Command Options */
	options?: Array<AnyCommandOption>;

	/** Use custom permission name, instead of the first element of aliases */
	permissionName?: string;

	/** Should this permission be granted, and by extension, the command be executable by default (Default is true) */
	permissionDefault?: boolean;

	/** Discord Permissions this command requires */
	selfPermissions?: Array<DiscordPermission>;

	/** Should this command be registered as a slash command? */
	registerSlash?: boolean | undefined;

	/** Register all aliases as seperate slash commands */
	slashAliases?: boolean | undefined;

	/** Disable execution via message w/ prefix */
	disablePrefix?: boolean;

	/** Suppressors */
	suppressors?: Array<SuppressorDefinition>;

	/** Function name or implementation to execute */
	execute?: string | ((ctx?: CommandContext) => Promise<any>);
}
