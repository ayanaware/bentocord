export interface Translateable {
	/** Translation Key */
	key: string;
	/** Translation Replacements */
	repl?: Record<string, unknown>;
	/** Use this sting if translation fails */
	backup?: string;
}
