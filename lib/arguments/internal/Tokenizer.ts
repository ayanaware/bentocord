import { Token } from './interfaces';
import { TokenType } from './constants';

export class Tokenizer {
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

		this.addToken(TokenType.WHITESPACE, ws[0]);
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
