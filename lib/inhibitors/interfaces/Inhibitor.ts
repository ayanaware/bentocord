import { CommandContext } from '../../commands/CommandContext';
import { InhibitorName, InhibitorType } from '../constants/InhibitorType';

export type InhibitorFn = (ctx?: CommandContext, ...args: Array<any>) => (boolean | string) | Promise<boolean | string>;
export type InhibitorDefinition = (InhibitorName | InhibitorFn) |
{ execute: InhibitorName | InhibitorFn, args?: Array<unknown>, context?: unknown };

export interface Inhibitor {
	inhibitor?: InhibitorType | string;
	execute: InhibitorFn;
	args?: Array<any>;
	context?: unknown;
}
