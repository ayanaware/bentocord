import { Entity, Type } from '@ayanaware/bento';

import { CommandContext } from '../CommandContext';
import { CommandManager } from '../CommandManager';
import { CommandDefinition } from './CommandDefinition';

export interface CommandEntity extends Entity {
	parent: Type<CommandManager>;

	definition: CommandDefinition;	
	execute(ctx?: CommandContext): Promise<any>;
}
