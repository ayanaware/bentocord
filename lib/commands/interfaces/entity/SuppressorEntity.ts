import type { Entity, InstanceType } from '@ayanaware/bento';

import type { CommandManager } from '../../CommandManager';
import type { Suppressor } from '../Suppressor';

export interface SuppressorEntity extends Entity, Suppressor {
	parent: InstanceType<CommandManager>;
}
