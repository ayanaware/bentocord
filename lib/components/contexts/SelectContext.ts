import { ComponentInteraction, ComponentInteractionSelectMenuData } from 'eris';

import { ComponentContext } from './ComponentContext';

export class SelectContext extends ComponentContext {
	public interaction: ComponentInteraction & { data: ComponentInteractionSelectMenuData };

	public get data(): ComponentInteractionSelectMenuData {
		return this.interaction.data;
	}

	public get values(): Array<string> {
		return this.data.values;
	}

	public hasValue(value: string): boolean {
		return this.values.includes(value);
	}
}
