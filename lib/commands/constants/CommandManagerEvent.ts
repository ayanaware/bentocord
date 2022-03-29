export enum CommandManagerEvent {
	/**
	 * Emitted when a command is registered.
	 * @param command The command that was registered.
	 */
	COMMAND_ADD = 'commandAdd',

	/**
	 * Emitted when a command is unregistered.
	 * @param command The command that was unregistered.
	 */
	COMMAND_REMOVE = 'commandRemove',

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
