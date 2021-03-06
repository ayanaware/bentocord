import { ComponentAPI } from '@ayanaware/bento';

import type { Bentocord } from '../../Bentocord';
import { CodeblockBuilder } from '../../builders/CodeblockBuilder';
import { AnyCommandContext } from '../CommandContext';
import { CommandManager } from '../CommandManager';
import { CommandDefinition } from '../interfaces/CommandDefinition';
import { CommandEntity } from '../interfaces/entity/CommandEntity';

export class BentoCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:BentoCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;
	public replaceable = true;

	public definition: CommandDefinition = {
		name: ['bento', 'bentocord', { key: 'BENTOCORD_COMMAND_BENTO' }],
		description: { key: 'BENTOCORD_COMMAND_BENTO_DESCRIPTION', backup: 'Display bentocord details' },

		hidden: true,
		registerSlash: false,
	};

	public async execute(ctx: AnyCommandContext): Promise<any> {
		const cb = new CodeblockBuilder();
		cb.addLine('Bento Version', this.api.getBentoVersion());
		const bentocord = this.api.getEntity<Bentocord>('@ayanaware/bentocord');
		cb.addLine('Bentocord Version', bentocord.version);

		return ctx.createResponse(cb.render());
	}
}
