import { Argument } from '../../arguments/interfaces/Argument';
import { DiscordPermission } from '../../discord/constants/DiscordPermission';
import { InhibitorDefinition } from '../../inhibitors/interfaces/Inhibitor';

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
