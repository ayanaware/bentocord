import { Token } from './interfaces';
import { TokenType } from './constants';

export class Tokenizer {
	public tokens: Array<Token>;

	private content: string;
	private position: number;

	private quoteState: boolean;

	private isTokenizing = false;

	public constructor(content: string) {
		this.setContent(content);
	}

	public setContent(content: string) {
		if (this.isTokenizing) throw new Error('setContent() may not be called while tokenizing');

		this.content = content;
		this.position = 0;

		this.tokens = [];

		this.quoteState = false;
	}

	public tokenize() {
		this.isTokenizing = true;
		while (this.content && this.position < this.content.length) this.nextToken();

		this.addToken(TokenType.EOF, null);

		this.isTokenizing = false;

		return this.tokens;
	}

	private addToken(type: TokenType, value: string) {
		this.tokens.push({ type, value });
	}

	private shift(n: number) {
		this.position += n;
	}

	private match(r: RegExp) {
		return this.content.slice(this.position).match(r);
	}

	private nextToken() {
		const order = [this.findWhitespace, this.findOption, this.findFlag, this.findQuote, this.findWord];

		for (const fn of order) {
			if (fn.bind(this)()) break;
		}
	}

	private findWhitespace() {
		const ws = this.match(/^\s+/);
		if (!ws) return false;

		this.addToken(TokenType.WHITESPACE, ws[0]);
		this.shift(ws[0].length);

		return true;
	}

	private findOption() {
		// ignore options if we are in quotes
		if (this.quoteState) return false;

		const option = this.match(/^--([^\s=]+)=?/);
		if (!option) return false;

		this.addToken(TokenType.OPTION, option[0]);
		this.shift(option[0].length);

		return true;
	}

	private findFlag() {
		// ignore flags if we are in quotes
		if (this.quoteState) return false;

		const flags = this.match(/^-([^-\s]+)/);
		if (!flags) return false;

		this.addToken(TokenType.FLAG, flags[0]);
		this.shift(flags[0].length);

		return true;
	}

	private findQuote() {
		if (this.quoteState) {
			// quote is OPEN right now
			const quoteClose = this.match(/^["“”]/);
			if (!quoteClose) return false;

			this.addToken(TokenType.QUOTE_END, '"');
			this.shift(1);

			this.quoteState = false;

			return true;
		}

		// No sign of quote
		const quoteOpen = this.match(/^["“”]/);
		if (!quoteOpen) return false;

		this.addToken(TokenType.QUOTE_START, '"');
		this.shift(1);

		this.quoteState = true;

		return true;
	}

	private findWord() {
		const word = this.match(this.quoteState ? /^[^\s"“”]+/ : /^\S+/);
		if (!word) return false;

		this.addToken(TokenType.WORD, word[0]);
		this.shift(word[0].length);

		return true;
	}
}
