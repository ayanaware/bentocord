/* Below is Bentocord's ArgumentParser this converts a raw input string into a series of tokens using the Tokenizer.	
 * These tokens are then passed through the Parser which builds them into larger pieces such as Phrases, Flags, and OptionFlags.
 * The Parser is also responsible for verifying things look "sane". For Example verifying that Quotes are closed etc
 * 
 * This was heavily inspired from Akario: https://github.com/discord-akairo/discord-akairo
 */

import { TokenType } from './constants';
import { Parsed, ParserOutput, Token } from './interfaces';

export interface AllowedOption {
	name: string;
	phrase: boolean;
}

export class Parser {
	public output: ParserOutput;

	private tokens: Array<Token>;
	private allowedOptions: Array<AllowedOption>;
	private poistion: number;

	private isParsing: boolean = false;

	public constructor(tokens: Array<Token>, allowedOptions: Array<AllowedOption> = []) {
		this.setTokens(tokens, allowedOptions);
	}

	public setTokens(tokens: Array<Token>, allowedOptions: Array<AllowedOption> = []) {
		if (this.isParsing) throw new Error('setTokens() may not be called while parsing');

		this.tokens = tokens;
		this.allowedOptions = allowedOptions;
		this.poistion = 0;

		this.output = { all: [], phrases: [], flags: [], options: [] };
	}

	public parse() {
		this.isParsing = true;
		while (this.poistion < this.tokens.length - 1) this.parseNext();

		this.isParsing = false;

		// Last should be EOF
		if (!this.match(TokenType.EOF, true)) throw new Error('Final Token is not EOF');

		return this.output;
	}

	private expectToken(tokens: TokenType | Array<TokenType>, lookahead: number = 0) {
		if (!Array.isArray(tokens)) tokens = [tokens];

		const token = this.tokens[this.poistion + lookahead];
		if (token == null) return false;
		
		return tokens.includes(token.type);
	}

	private match(tokens: TokenType | Array<TokenType>, advance: boolean = false) {
		const result = this.expectToken(tokens);
		if (!result) return false;

		const token = this.tokens[this.poistion];
		if (advance) this.poistion++;

		return token;
	}

	private parseNext() {
		const order = [this.parseWhitespace, this.parseOption, this.parseFlag, this.parsePhrase];
	
		for (const fn of order) fn.call(this);
	}

	private parseWhitespace() {
		// consume whitespace
		this.match([TokenType.WHITESPACE], true);
	}

	private parseOption() {
		const optionToken = this.match([TokenType.OPTION]);
		if (!optionToken) return;

		let optionKey = optionToken.value.replace(/^--|=/g, '');

		// option must be allowed
		const allowedOption = this.allowedOptions.find(i => i.name === optionKey);
		if (!allowedOption) return;

		// option enabled we can consume it
		this.poistion++;


		const option: Parsed = { value: null, key: optionKey, raw: `${optionToken.value}` };

		// handle phrase if enabled
		if (allowedOption.phrase) {
			// handle whitespace
			const ws = this.match([TokenType.WHITESPACE], true);
			const phrase = this.parsePhrase(true) || { value: null, raw: '' };
			if (ws) phrase.raw = `${ws.value}${phrase.raw}`;

			option.value = phrase.value;
			option.raw = phrase.raw;
		}

		this.output.all.push(option);
		this.output.options.push(option);
	}

	private parseFlag() {
		const flagToken = this.match([TokenType.FLAG], true);
		if (!flagToken) return;

		const flagValue = flagToken.value.replace(/^-/, '');
		for (const c of flagValue) {
			const flag = { value: c, raw: flagToken.value };

			this.output.all.push(flag);
			this.output.flags.push(flag);
		}
	}

	private parsePhrase(returnMode: boolean = false) {
		// handle quotes
		const quoteOpenToken = this.match([TokenType.QUOTE_START], true);
		if (quoteOpenToken) {
			// this is the start of a quoted phrase
			let raw = quoteOpenToken.value;
			const collector = [];

			let token = null;
			while(token = this.match([TokenType.WORD, TokenType.WHITESPACE], true)) {
				if (typeof token !== 'object') continue; // make typescript happy
				raw = `${raw}${token.value}`;

				if (token.type == TokenType.WORD) collector.push(token.value);
			}

			let quoteCloseToken = this.match([TokenType.QUOTE_END], true);
			if (!quoteCloseToken) {
				// Quoted Phrase was not closed :AWAUGERYY:
				// Just close it ourself
				quoteCloseToken = { type: TokenType.QUOTE_END, value: '"' };
			}
			raw = `${raw}${quoteCloseToken.value}`;

			const phrase: Parsed = { value: collector.join(' '), raw };
			if (returnMode) return phrase;

			this.output.all.push(phrase);
			this.output.phrases.push(phrase);

			return;
		}

		// word
		const wordToken = this.match([TokenType.WORD, TokenType.OPTION], true);
		console.log(this.tokens[this.poistion]);
		if (!wordToken) return;

		const phrase: Parsed = { value: wordToken.value, raw: wordToken.value };
		if (returnMode) return phrase;

		this.output.all.push(phrase);
		this.output.phrases.push(phrase);
	}
}
