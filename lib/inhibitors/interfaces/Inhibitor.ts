import { CommandContext } from '../../commands';
import { InhibitorName, InhibitorType } from '../constants';

export type InhibitorFn = (ctx?: CommandContext, ...args: Array<any>) => (boolean | string) | Promise<boolean | string>;
export type InhibitorDefinition = (InhibitorName | InhibitorFn) | { fn: InhibitorName | InhibitorFn, args?: Array<any> };

export interface Inhibitor {
	type: InhibitorType;
	fn: InhibitorFn;
}
