/* eslint-disable no-bitwise */
import { Embed } from 'eris';

import { ApplicationCommandOptionType, ApplicationCommandType } from './ApplicationCommand';

export enum InteractionType {
	PING = 1,
	APPLICATION_COMMAND = 2,
	MESSAGE_COMPONENT = 3,
}

export interface Interaction {
	id: string;
	type: InteractionType;
	version: 1;

	application_id: string;

	token: string;

	data?: InteractionData;

	channel_id?: string;

	// exists if executed in dm
	user?: { id: string };

	// exists if executed in guild
	guild_id?: string;
	member?: { id: string };
}

export interface InteractionData {
	id: string;
	name: string;
	type: ApplicationCommandType;

	options?: Array<InteractionDataOption>;
}

export interface InteractionDataOption {
	name: string;
	type: ApplicationCommandOptionType;

	value?: unknown;
	options?: Array<InteractionDataOption>;
}

export enum InteractionResponseType {
	PONG = 1,
	CHANNEL_MESSAGE_WITH_SOURCE = 4,
	DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5,
	DEFERRED_UPDATE_MESSAGE = 6,
	UPDATE_MESSAGE = 7,
}

export interface InteractionResponse {
	type: InteractionResponseType;
	data?: InteractionResponseData;
}

export enum InteractionResponseFlags {
	EPHEMERAL = 1 << 6,
}

export interface InteractionResponseData {
	content?: string;
	embeds?: Array<Embed>;

	components?: Array<any>; // later

	allowed_mentions?: any; // later

	flags?: number;

	tts?: boolean;
}
