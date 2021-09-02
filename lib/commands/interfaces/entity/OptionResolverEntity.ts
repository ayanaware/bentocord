import { Entity, InstanceType } from '@ayanaware/bento';

import { CommandManager } from '../../CommandManager';
import { OptionResolver } from '../OptionResolver';

export interface OptionResolverEntity extends Entity, OptionResolver<unknown> {
	parent: InstanceType<CommandManager>;
}
