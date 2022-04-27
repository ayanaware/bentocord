export interface Translateable {
	/** Translation Key */
	key: string;

	/** Translation Replacements */
	repl?: Record<string, unknown>;

	/** String to use if key doesn't exist */
	backup?: string;
}
