export enum CommandManagerEvent {
	/**
	 * Fired when a command is successfully executed
	 * @param command Command
	 * @param context CommandContext
	 * @param options Options
	 * @param mili Milliseconds
	 */
	COMMAND_SUCCESS = 'commandSuccess',

	/**
	 * Fired when a command throws an error
	 * @param command Command
	 * @param context CommandContext
	 * @param options Options
	 * @param error Error
	 */
	COMMAND_FAILURE = 'commandFailure',
}