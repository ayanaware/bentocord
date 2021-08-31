
export enum ApplicationCommandType {
	CHAT_INPUT = 1,
	USER = 2,
	MESSAGE = 3,
}

export interface ApplicationCommand {
	id?: string;
	type: ApplicationCommandType;

	application_id: string;
	guild_id?: string;

	name: string;
	description: string;

	options?: Array<ApplicationCommandOption>;

	default_permission: boolean;
}

export enum ApplicationCommandOptionType {
	SUB_COMMAND = 1,
	SUB_COMMAND_GROUP = 2,

	STRING = 3,
	INTEGER = 4, // integer
	BOOLEAN = 5,

	USER = 6,
	CHANNEL = 7,
	ROLE = 8,
	MENTIONABLE = 9,

	NUMBER = 10, // double
}

export interface ApplicationCommandOption {
	type: ApplicationCommandOptionType;
	name: string;
	description: string;

	required?: boolean;

	choices?: Array<ApplicationCommandOptionChoice>;
	options?: Array<ApplicationCommandOption>;
}

export interface ApplicationCommandOptionChoice {
	name: string;
	value: string | number;
}
