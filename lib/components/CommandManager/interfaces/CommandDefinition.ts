import { ArgumentType } from '../constants';
import { Argument } from './Argument';

export interface CommandDefinition {
	aliases: Array<string>;
	args?: Array<Argument>;
}
