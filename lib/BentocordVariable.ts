export enum BentocordVariable {
	/**
	 * The Discord token.
	 */
	BENTOCORD_TOKEN = 'BENTOCORD_TOKEN',

	/**
	 * Custom client options to pass to Eris.
	 */
	BENTOCORD_CLIENT_OPTIONS = 'BENTOCORD_CLIENT_OPTIONS',

	/**
	 * A list of user id's that are considered to be administrators.
	 */
	BENTOCORD_BOT_OWNERS = 'BENTOCORD_BOT_OWNERS',

	/**
	 * Disable much of the bot's functionality, except for those in the BENTOCORD_BOT_OWNERS list.
	 */
	BENTOCORD_IGNORE_MODE = 'BENTOCORD_IGNORE_MODE',

	/**
	 * Default prefix for the bot.
	 */
	BENTOCORD_COMMAND_PREFIX = 'BENTOCORD_COMMAND_PREFIX',

	/**
	 * The default activity for the bot.
	 */
	BENTOCORD_ACTIVITY_NAME = 'BENTOCORD_ACTIVITY_NAME',

	/**
	 * Should the optional built-in commands be registered?
	 */
	BENTOCORD_BUILTIN_COMMANDS = 'BENTOCORD_BUILTIN_COMMANDS',
}
