import type { Entity, InstanceType } from '@ayanaware/bento';

import type { CommandManager } from '../../CommandManager';
import type { OptionResolver } from '../OptionResolver';

export interface OptionResolverEntity extends Entity, OptionResolver<unknown> {
	parent: InstanceType<CommandManager>;
}
