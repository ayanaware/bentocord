import { ComponentAPI } from '@ayanaware/bento';

import type { Bentocord } from '../../Bentocord';
import { CodeblockBuilder } from '../../builders/CodeblockBuilder';
import { CommandContext } from '../CommandContext';
import { CommandManager } from '../CommandManager';
import { CommandDefinition } from '../interfaces/CommandDefinition';
import { CommandEntity } from '../interfaces/entity/CommandEntity';

export class BentoCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:BentoCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: [{ key: 'BENTOCORD_COMMAND_BENTO', backup: 'bento' }, 'bentocord'],
		description: { key: 'BENTOCORD_COMMAND_BENTO_DESCRIPTION', backup: 'Display bentocord details' },

		registerSlash: false,
	};

	public async execute(ctx: CommandContext): Promise<any> {
		const cb = new CodeblockBuilder();
		cb.addLine('Bento Version', this.api.getBentoVersion());
		const bentocord = this.api.getEntity<Bentocord>('@ayanaware/bentocord');
		cb.addLine('Bentocord Version', bentocord.version);

		return ctx.createResponse(cb.render());
	}
}
