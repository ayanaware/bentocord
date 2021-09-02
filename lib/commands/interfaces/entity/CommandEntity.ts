import { Entity, InstanceType } from '@ayanaware/bento';

import { CommandManager } from '../../CommandManager';
import { Command } from '../Command';

export interface CommandEntity extends Entity, Command {
	parent: InstanceType<CommandManager>;
}
