import { APIApplicationCommand, APIApplicationCommandOptionChoice, ApplicationCommandOptionType, Snowflake } from 'discord-api-types';

export interface ApplicationCommand extends Omit<APIApplicationCommand, 'id'> {
	id?: Snowflake;
}

export interface ApplicationCommandOption {
	type: ApplicationCommandOptionType;
	name: string;
	description: string;
	choices?: Array<APIApplicationCommandOptionChoice>;
	required?: boolean;
	options?: Array<ApplicationCommandOption>;
}
