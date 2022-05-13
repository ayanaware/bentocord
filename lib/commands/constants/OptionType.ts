export enum OptionType {
	// SUBCOMMAND
	SUB_COMMAND,
	SUB_COMMAND_GROUP,

	// PRIMITIVES
	/** boolean */
	BOOLEAN,
	/** integer */
	INTEGER,
	/** string */
	STRING,

	/** number (double) */
	NUMBER,
	/** bigint */
	BIG_INTEGER,

	// DISCORD
	/** User, Member if in guild */
	USER,

	/** Guild Channel */
	CHANNEL,

	/** Guild Role */
	ROLE,

	// DISCORD SPECIAL
	/** Guild */
	GUILD,

	EMOJI,
}
