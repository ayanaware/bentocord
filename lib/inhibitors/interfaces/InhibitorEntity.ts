import { Entity } from '@ayanaware/bento';
import { Type } from '../../Bentocord';

import { InhibitorManager } from '../InhibitorManager';
import { InhibitorFn } from './Inhibitor';

export interface InhibitorEntity extends Entity {
	parent: Type<InhibitorManager>;

	inhibitor: string;
	execute: InhibitorFn;
}
