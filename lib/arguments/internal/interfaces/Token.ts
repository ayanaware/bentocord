import { TokenType } from '../constants';

export interface Token {
	type: TokenType;
	value?: string;
}
