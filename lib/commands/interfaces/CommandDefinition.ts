import { Argument } from '../../arguments';

export interface CommandDefinition {
	aliases: Array<string>;
	args?: Array<Argument>;
}
