import {Parsed} from './Parsed';

export interface ParserOutput {
	all: Array<Parsed>;
	phrases: Array<Parsed>;
	flags: Array<Parsed>;
	options: Array<Parsed>;
}
