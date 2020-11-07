import {Parsed} from './Parsed';

export interface ParsedResult {
	all: Array<Parsed>;
	phrases: Array<Parsed>;
	flags: Array<Parsed>;
	optionFlags: Array<Parsed>;
}
