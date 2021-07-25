import { ComponentAPI } from '@ayanaware/bento';

import { Bentocord } from '../../Bentocord';
import { CodeblockBuilder } from '../../builders';

import { CommandDefinition, CommandEntity } from '../interfaces';
import { CommandManager } from '../CommandManager';
import { CommandContext } from '../CommandContext';

export class BentoCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:BentoCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['bento', 'bentocord'],
	};

	public async execute(ctx: CommandContext) {
		const builder = new CodeblockBuilder();
		builder.addLine('Bento Version', this.api.getBentoVersion());
		builder.addLine('Bentocord Version', this.api.getEntity(Bentocord).version);

		return ctx.messenger.createMessage(await builder.render());
	}
}