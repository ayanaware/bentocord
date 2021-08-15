import { Entity, InstanceType } from '@ayanaware/bento';

import { InhibitorManager } from '../InhibitorManager';

import { InhibitorFn } from './Inhibitor';

export interface InhibitorEntity extends Entity {
	parent: InstanceType<InhibitorManager>;

	inhibitor: string;
	execute: InhibitorFn;
}
