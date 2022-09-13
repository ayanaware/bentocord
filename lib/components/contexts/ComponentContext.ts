import { EntityAPI } from '@ayanaware/bento';

import { ComponentInteraction, Message } from 'eris';

import { InteractionContext } from '../../contexts/InteractionContext';
import { ParseCustomId, ParsedCustomId } from '../util/ParseCustomId';

export class ComponentContext extends InteractionContext {
	public interaction: ComponentInteraction;

	public message: Message;
	public get messageId(): string {
		return this.message.id;
	}

	public constructor(api: EntityAPI, interaction: ComponentInteraction) {
		super(api, interaction);

		this.message = interaction.message;
	}

	public get data(): ComponentInteraction['data'] {
		return this.interaction.data;
	}

	public get customId(): string {
		return this.data.custom_id;
	}

	public parseCustomId(): ParsedCustomId {
		return ParseCustomId(this.customId);
	}

	public async deferUpdate(): Promise<void> {
		if (this.interaction.acknowledged) return;

		return this.interaction.deferUpdate();
	}
}
