import { Entity, InstanceType } from '@ayanaware/bento';

import { CommandContext } from '../CommandContext';
import { CommandManager } from '../CommandManager';

import { CommandDefinition } from './CommandDefinition';

export interface CommandEntity extends Entity {
	parent: InstanceType<CommandManager>;

	definition: CommandDefinition;
	execute(ctx?: CommandContext, options?: Record<string, unknown>): Promise<any>;
}
