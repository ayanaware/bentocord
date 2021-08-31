import { Token, TokenType } from './Tokenizer';

export interface ParsedItem {
	value: string;
	key?: string;
	raw?: string;
}

export interface ParserOutput {
	all: Array<ParsedItem>;
	phrases: Array<ParsedItem>;

	options: Array<ParsedItem>;
}

export class Parser {
	public output: ParserOutput = { all: [], options: [], phrases: [] };

	private readonly tokens: Array<Token>;
	private postion: number = 0;

	public constructor(tokens: Array<Token>) {
		this.tokens = tokens;
	}

	public parse(): ParserOutput {
		while (this.postion < this.tokens.length - 1) this.parseNext();

		return this.output;
	}

	private expectToken(tokens: Array<TokenType>, lookahead = 0) {
		const token = this.tokens[this.postion + lookahead];
		if (token == null) return false;

		return tokens.includes(token.type);
	}

	private match(tokens: Array<TokenType>, advance = false) {
		const result = this.expectToken(tokens);
		if (!result) return false;

		const token = this.tokens[this.postion];
		if (advance) this.postion++;

		return token;
	}

	private parseNext() {
		for (const fn of [this.parseWhitespace.bind(this), this.parseOption.bind(this), this.parsePhrase.bind(this)]) fn();
	}

	private parseWhitespace() {
		// Consume whitespace
		this.match([TokenType.WHITESPACE], true);
	}

	private parseOption() {
		const optionToken = this.match([TokenType.OPTION], true);
		if (!optionToken) return;

		const optionKey = optionToken.value.replace(/[:= ]/g, '');
		const option: ParsedItem = { value: '', key: optionKey, raw: `${optionToken.value}` };

		const collector = [];

		let token = null;
		// eslint-disable-next-line no-cond-assign
		while (token = this.match([TokenType.WORD, TokenType.WHITESPACE, TokenType.QUOTE_OPEN, TokenType.QUOTE_CLOSE], true)) {
			if (typeof token !== 'object') continue;
			option.raw += token.value;

			if (token.type === TokenType.WORD) collector.push(token.value);
		}

		option.value = collector.join(' ');

		this.output.all.push(option);
		this.output.options.push(option);
	}

	private parsePhrase(returnMode = false) {
		// handle quotes
		const quoteOpenToken = this.match([TokenType.QUOTE_OPEN], true);
		if (quoteOpenToken) {
			// this is the start of a quoted phrase
			let raw = quoteOpenToken.value;
			const collector = [];

			let token = null;
			// eslint-disable-next-line no-cond-assign
			while (token = this.match([TokenType.WORD, TokenType.WHITESPACE], true)) {
				if (typeof token !== 'object') continue; // make typescript happy
				raw = `${raw}${token.value}`;

				if (token.type === TokenType.WORD) collector.push(token.value);
			}

			let quoteCloseToken = this.match([TokenType.QUOTE_CLOSE], true);
			if (!quoteCloseToken) {
				// Quoted Phrase was not closed :AWAUGERYY:
				// Just close it ourself
				quoteCloseToken = { type: TokenType.QUOTE_CLOSE, value: '"' };
			}
			raw = `${raw}${quoteCloseToken.value}`;

			const quotePhrase: ParsedItem = { value: collector.join(' '), raw };
			if (returnMode) return quotePhrase;

			this.output.all.push(quotePhrase);
			this.output.phrases.push(quotePhrase);

			return;
		}

		// word
		const wordToken = this.match([TokenType.WORD], true);
		if (!wordToken) return;

		const phrase: ParsedItem = { value: wordToken.value, raw: wordToken.value };
		if (returnMode) return phrase;

		this.output.all.push(phrase);
		this.output.phrases.push(phrase);
	}
}
