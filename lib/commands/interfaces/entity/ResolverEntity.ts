import type { Entity, InstanceType } from '@ayanaware/bento';

import type { CommandManager } from '../../CommandManager';
import type { Resolver } from '../Resolver';

export interface ResolverEntity extends Entity, Resolver<unknown> {
	parent: InstanceType<CommandManager>;
}
