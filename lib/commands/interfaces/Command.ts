import type { CommandContext } from '../CommandContext';

import type { CommandDefinition } from './CommandDefinition';

export interface Command {
	/** Command Definition */
	definition: CommandDefinition;

	/** Command Execute */
	execute(ctx: CommandContext, options?: Record<string, unknown>): Promise<any>;
}
