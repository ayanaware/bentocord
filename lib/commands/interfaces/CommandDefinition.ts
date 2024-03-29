import type { DiscordPermission } from '../../discord/constants/DiscordPermission';
import { PossiblyTranslatable } from '../../interfaces/Translatable';
import type { AnyCommandContext } from '../CommandContext';

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
	name: [string, ...Array<PossiblyTranslatable>];

	/**
	 * Please use the `name` key instead
	 * @deprecated
	 */
	aliases?: never;

	/** Command Category; Fully Optional, used by help & some permission */
	category?: string;

	/** Command Description */
	description: PossiblyTranslatable;

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

	/** Domain-specific options */
	extra?: Record<string, unknown>;

	/** Function name or implementation to execute */
	execute?: string | ((ctx?: AnyCommandContext) => Promise<any>);
}
