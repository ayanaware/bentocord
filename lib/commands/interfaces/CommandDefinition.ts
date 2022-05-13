import type { DiscordPermission } from '../../discord/constants/DiscordPermission';
import { Translateable } from '../../interfaces/Translateable';
import type { CommandContext } from '../CommandContext';

import type { AnyCommandOption } from './CommandOption';
import type { SuppressorDefinition } from './Suppressor';

export interface CommandPermissionDefaults {
	/** Should this permission be granted by default for any average user (Default: true) */
	user: boolean;

	/** Should this permission be granted by default if the user has the ADMIN discord permission (Default: true) */
	admin: boolean;
}

export interface CommandDefinition {
	/** Command Aliases; First will be used for slash command name */
	name: [string, ...Array<string | Translateable>];

	/**
	 * Please use the `name` key instead
	 * @deprecated
	 */
	aliases?: never;

	/** Command Category; Fully Optional, used by help & some permission */
	category?: string;

	/** Command Description */
	description: string | Translateable;

	/** Command Options */
	options?: Array<AnyCommandOption>;

	/** Use custom permission name, instead of the first element of aliases */
	permissionName?: string;

	/** Should this permission be granted, and by extension, the command be executable when no permission overrides exist */
	permissionDefaults?: CommandPermissionDefaults | boolean;

	/** Discord Permissions this command requires */
	selfPermissions?: Array<DiscordPermission>;

	/** Can this command be used in Direct Messages */
	allowDM?: boolean;

	/** Should this command be registered as a slash command? */
	registerSlash?: boolean;

	/** Disable execution via message w/ prefix */
	disablePrefix?: boolean;

	/** Suppressors */
	suppressors?: Array<SuppressorDefinition>;

	/** Hide this command from general users */
	hidden?: boolean;

	/** Function name or implementation to execute */
	execute?: string | ((ctx?: CommandContext) => Promise<any>);
}
