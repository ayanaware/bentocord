import { Entity, Type } from '@ayanaware/bento';

import { InhibitorManager } from '../InhibitorManager';
import { InhibitorFn } from './Inhibitor';

export interface InhibitorEntity extends Entity {
	parent: Type<InhibitorManager>;

	inhibitor: string;
	execute: InhibitorFn;
}
