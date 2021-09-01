export enum OptionType {
	// SUBCOMMAND
	SUB_COMMAND,
	SUB_COMMAND_GROUP,

	// PRIMITIVES
	/** boolean */
	BOOLEAN,
	/** number */
	NUMBER,
	/** string */
	STRING,

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
}
