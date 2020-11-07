/* Below is Bentocord's ArgumentParser this converts a raw input string into a series of tokens using the Tokenizer.	
 * These tokens are then passed through the Parser which builds them into larger pieces such as Phrases, Flags, and OptionFlags.
 * The Parser is also responsible for verifying things look "sane". For Example verifying that Quotes are closed etc
 * 
 * This was heavily inspired from Akario: https://github.com/discord-akairo/discord-akairo
 */

export enum ParsedArgumentType { PHRASE, FLAG, OPTION_FLAG }

export interface ParsedArgument {
	type: ParsedArgumentType;
	value: string;
	raw?: string;
}

export interface ParsedArguments {
	all: Array<ParsedArgument>;
	phrases: Array<ParsedArgument>;
	flags: Array<ParsedArgument>;
	optionFlags: Array<ParsedArgument>;
}

export class ArgumentParser {
	public results: ParsedArguments;

	public readonly tokens: Array<Token>;
	private poistion = 0;

	public constructor(content: string) {
		const tokenizer = new Tokenizer(content);
		this.tokens = tokenizer.tokenize();
	}

	public parse() {
		this.results = { all: [], phrases: [], flags: [], optionFlags: [] };

		// loop over tokens
		while (this.poistion < this.tokens.length - 1) this.parseNext();

		// expect EOF, throw if not
		if (!this.match(TokenType.EOF, true)) throw new Error('Final token not EOF');

		return this.results;
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
		const order = [this.parseWhitespace, this.parseFlag, this.parsePhrase];
	
		for (const fn of order) fn.bind(this)()
	}

	private parseWhitespace() {
		// consume whitespace
		this.match([TokenType.WS], true);
	}

	private parseFlag() {
		const flagToken = this.match([TokenType.FLAG], true);
		if (!flagToken) return;

		const flagValue = flagToken.value.replace(/^-{1,2}/gi, '');
		for (const c of flagValue) {
			const flag = { type: ParsedArgumentType.FLAG, value: c, raw: flagToken.value };

			this.results.all.push(flag);
			this.results.flags.push(flag);
		}
	}

	private parsePhrase() {
		// handle quotes
		const quoteOpenToken = this.match([TokenType.QUOTE_OPEN], true);
		if (quoteOpenToken) {
			// this is the start of a quoted phrase
			let raw = quoteOpenToken.value;
			const collector = [];

			let token = null;
			while(token = this.match([TokenType.WORD, TokenType.WS], true)) {
				if (typeof token !== 'object') continue; // make typescript happy
				raw = `${raw}${token.value}`;

				if (token.type == TokenType.WORD) collector.push(token.value);
			}

			let quoteCloseToken = this.match([TokenType.QUOTE_CLOSE], true);
			if (!quoteCloseToken) {
				// Quoted Phrase was not closed :AWAUGERYY:
				// Just close it ourself
				quoteCloseToken = { type: TokenType.QUOTE_CLOSE, value: '"' };
			}
			raw = `${raw}${quoteCloseToken.value}`;

			const phrase: ParsedArgument = { type: ParsedArgumentType.PHRASE, value: collector.join(' '), raw };
			this.results.all.push(phrase);
			this.results.phrases.push(phrase);

			return;
		}

		// word
		const wordToken = this.match([TokenType.WORD], true);
		if (!wordToken) return;

		const phrase: ParsedArgument = { type: ParsedArgumentType.PHRASE, value: wordToken.value, raw: wordToken.value };
		this.results.all.push(phrase);
		this.results.phrases.push(phrase);
	}
}

enum TokenType {
	WS,
	WORD,
	FLAG,
	OPTIONFLAG,
	QUOTE_OPEN,
	QUOTE_CLOSE,
	EOF,
}

interface Token {
	type: TokenType;
	value?: string;
}

class Tokenizer {
	private content: string;
	private position = 0;

	private quoteState: boolean;

	private tokens: Array<Token> = [];

	public constructor(content: string) {
		this.content = content;
	}

	public tokenize() {
		while (this.content && this.position < this.content.length) this.findNextToken();

		this.addToken(TokenType.EOF, null);
		return this.tokens;
	}

	private addToken(type: TokenType, value: string) {
		this.tokens.push({ type, value });
	}

	private advance(n: number) {
		this.position += n;
	}

	private match(r: RegExp) {
		return this.content.slice(this.position).match(r);
	}

	private findNextToken() {
		const order = [this.findWhitespace, this.findQuote, this.findFlags ,this.findWord];

		for (const fn of order) {
			if (fn.bind(this)()) break;
		}
	}

	private findWhitespace() {
		const ws = this.match(/^\s+/);
		if (!ws) return false;

		this.addToken(TokenType.WS, ws[0]);
		this.advance(ws[0].length);

		return true;
	}

	private findQuote() {
		if (this.quoteState) {
			// quote is OPEN right now
			const quoteClose = this.match(/^["“”]/);
			if (!quoteClose) return false;

			this.addToken(TokenType.QUOTE_CLOSE, '"');
			this.advance(1);

			this.quoteState = false;

			return true;
		}

		// No sign of quote
		const quoteOpen = this.match(/^["“”]/);
		if (!quoteOpen) return false;

		this.addToken(TokenType.QUOTE_OPEN, '"');
		this.advance(1);

		this.quoteState = true;

		return true;
	}

	private findFlags() {
		const flags = this.match(/^-[^-\s]+/);
		if (!flags) return false;

		// add group 1 match, this just drops the -
		this.addToken(TokenType.FLAG, flags[0]);
		this.advance(flags[0].length);

		return true;
	}

	private findWord() {
		const word = this.match(this.quoteState ? /^[^\s"“”]+/ : /^\S+/);
		if (!word) return false;

		this.addToken(TokenType.WORD, word[0]);
		this.advance(word[0].length);

		return true;
	}
}
