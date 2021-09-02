import { Entity, InstanceType } from '@ayanaware/bento';

import { CommandManager } from '../../CommandManager';
import { Suppressor } from '../Suppressor';

export interface SuppressorEntity extends Entity, Suppressor {
	parent: InstanceType<CommandManager>;
}
