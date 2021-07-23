import { Entity } from '@ayanaware/bento';
import { Type } from '../../types/Type';

import { CommandContext } from '../CommandContext';
import { CommandManager } from '../CommandManager';
import { CommandDefinition } from './CommandDefinition';

export interface CommandEntity extends Entity {
	parent: Type<CommandManager>;

	definition: CommandDefinition;	
	execute(ctx?: CommandContext): Promise<any>;
}
