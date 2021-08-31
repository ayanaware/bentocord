
export enum TokenType {
	WHITESPACE,
	WORD,
	QUOTE_OPEN,
	QUOTE_CLOSE,
	OPTION,
	EOF,
}

export interface Token {
	type: TokenType;
	value?: string;
}

export class Tokenizer {
	public tokens: Array<Token> = [];

	private readonly content: string;
	private position: number = 0;

	private quoteState = false;

	public constructor(content: string) {
		this.content = content;
	}

	public tokenize(): Array<Token> {
		while (this.content && this.position < this.content.length) this.nextToken();

		this.addToken(TokenType.EOF, null);

		return this.tokens;
	}

	private addToken(type: TokenType, value: string) {
		this.tokens.push({ type, value });
	}

	private shift(n: number) {
		this.position += n;
	}

	private addAndShiftToken(type: TokenType, value: string) {
		this.addToken(type, value);
		this.shift(value.length);
	}

	private match(r: RegExp) {
		return r.exec(this.content.slice(this.position));
	}

	private nextToken() {
		for (const fn of [this.findWhitespace.bind(this), this.findOption.bind(this), this.findQuote.bind(this), this.findWord.bind(this)]) {
			if (fn()) break;
		}
	}

	private findWhitespace() {
		const ws = this.match(/^\s+/);
		if (!ws) return false;

		this.addAndShiftToken(TokenType.WHITESPACE, ws[0]);

		return true;
	}

	private findOption() {
		// ignore options in quotes
		if (this.quoteState) return false;

		// options are words followed by : or =
		const option = this.match(/^([a-z0-9]+)[:=]\s?/);
		if (!option) return false;

		this.addAndShiftToken(TokenType.OPTION, option[0]);

		return true;
	}

	private findQuote() {
		const quote = this.match(/^["“”]/);
		if (!quote) return false;

		// Toggle Quote state
		this.addAndShiftToken(this.quoteState ? TokenType.QUOTE_CLOSE : TokenType.QUOTE_OPEN, '"');
		this.quoteState = !this.quoteState;

		return true;
	}

	private findWord() {
		const word = this.match(this.quoteState ? /^[^\s"“”]+/ : /^\S+/);
		if (!word) return false;

		this.addAndShiftToken(TokenType.WORD, word[0]);

		return true;
	}
}
