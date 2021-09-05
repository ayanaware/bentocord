import type { Entity, InstanceType } from '@ayanaware/bento';

import type { CommandManager } from '../../CommandManager';
import type { Command } from '../Command';

export interface CommandEntity extends Entity, Command {
	parent: InstanceType<CommandManager>;
}
