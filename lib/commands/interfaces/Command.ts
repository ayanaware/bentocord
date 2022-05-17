import type { AnyCommandContext } from '../CommandContext';

import type { CommandDefinition } from './CommandDefinition';

export interface Command {
	/** Command Definition */
	definition: CommandDefinition;

	/** Command Execute */
	execute(ctx: AnyCommandContext, options?: Record<string, unknown>): Promise<any>;
}
