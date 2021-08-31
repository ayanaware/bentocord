export enum OptionType {
	// SUBCOMMAND
	SUB_COMMAND,
	SUB_COMMAND_GROUP,

	// PRIMITIVES
	BOOLEAN,
	NUMBER,
	STRING,

	// Discord User
	USER,
	MEMBER,

	// Discord Channel
	CHANNEL,
	TEXT_CHANNEL,
	VOICE_CHANNEL,

	// Discord Guild
	GUILD,

	// Discord Roles
	ROLE,
}
