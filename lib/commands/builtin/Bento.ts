import { ComponentAPI } from '@ayanaware/bento';

import { Bentocord } from '../../Bentocord';
import { CodeblockBuilder } from '../../builders/CodeblockBuilder';
import { CommandContext } from '../CommandContext';
import { CommandManager } from '../CommandManager';
import { CommandDefinition } from '../interfaces/CommandDefinition';
import { CommandEntity } from '../interfaces/CommandEntity';

export class BentoCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:BentoCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['bento', 'bentocord'],
		description: 'Display Bentocord details',

		registerSlash: false,
	};

	public async execute(ctx: CommandContext): Promise<any> {
		const builder = new CodeblockBuilder();
		builder.addLine('Bento Version', this.api.getBentoVersion());
		builder.addLine('Bentocord Version', this.api.getEntity(Bentocord).version);

		return ctx.createResponse(await builder.render());
	}
}
