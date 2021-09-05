import type { ApplicationCommandOptionType } from 'discord-api-types';

export interface InteractionDataOption<D = unknown> {
	name: string;
	type: ApplicationCommandOptionType;
	value?: D;
	options?: Array<InteractionDataOption>;
}
