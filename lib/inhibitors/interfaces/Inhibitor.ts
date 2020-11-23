import { CommandContext } from '../../commands';
import { InhibitorName, InhibitorType } from '../constants';

export type InhibitorFn = (ctx?: CommandContext, ...args: Array<any>) => (boolean | string) | Promise<boolean | string>;
export type InhibitorDefinition = (InhibitorName | InhibitorFn) | { execute: InhibitorName | InhibitorFn, args?: Array<any>, context?: any };

export interface Inhibitor {
	inhibitor?: InhibitorType | string;
	execute: InhibitorFn;
	args?: Array<any>
	context?: any;
}
