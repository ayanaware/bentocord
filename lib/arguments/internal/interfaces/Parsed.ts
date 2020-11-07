import { ParsedType } from '../constants';

export interface Parsed {
	type: ParsedType;
	value: string;
	raw?: string;
}
