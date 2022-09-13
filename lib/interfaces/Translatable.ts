export interface Translatable {
	/** Translation Key */
	key: string;

	/** Translation Replacements */
	repl?: Record<string, unknown>;

	/** String to use if key doesn't exist */
	backup?: string;
}

/** Helper Type; Used to signify something might be translated or just a string */
export type PossiblyTranslatable = string | Translatable;
