import { Argument } from '../../arguments';
import { DiscordPermission } from '../../discord';
import { InhibitorDefinition } from '../../inhibitors';

export interface CommandDefinition {
	/** Command Aliases */
	aliases: Array<string>;

	/** Command Inhibitors */
	inhibitors?: Array<InhibitorDefinition>;

	/** Argument definitions */
	args?: Array<Argument>;

	/** Discord permissions */
	selfPermissions?: Array<DiscordPermission>;
}
