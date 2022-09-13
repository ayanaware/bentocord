/**
 * Used to "bubble up" events as a Command executes, when it isn't really an "error"
 */
export const NON_ERROR_HALT = '__NON_ERROR_HALT__';

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
	 * @param context AnyCommandContext
	 * @param options Options
	 * @param mili Miliseconds
	 */
	COMMAND_SUCCESS = 'commandSuccess',

	/**
	 * Fired when a command throws an error
	 * @param error Error
	 * @param command Command
	 * @param context AnyCommandContext
	 * @param options Options
	 * @param mili Miliseconds
	 */
	COMMAND_FAILURE = 'commandFailure',
}
