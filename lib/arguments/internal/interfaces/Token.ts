import { TokenType } from '../constants/TokenType';

export interface Token {
	type: TokenType;
	value?: string;
}
