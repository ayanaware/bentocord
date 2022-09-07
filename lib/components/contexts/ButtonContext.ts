import { ComponentInteraction, ComponentInteractionButtonData, TextableChannel } from 'eris';

import { ComponentContext } from './ComponentContext';

export class ButtonContext extends ComponentContext {
	public interaction: ComponentInteraction & { data: ComponentInteractionButtonData };

	public get data(): ComponentInteractionButtonData {
		return this.interaction.data;
	}
}
