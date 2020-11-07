import { ComponentAPI } from '@ayanaware/bento';

import { Bentocord } from "../Bentocord";
import { CodeblockBuilder } from '../abstractions';
import { Command, CommandContext, CommandManager  } from "../components/CommandManager";
import { CommandDefinition } from '../components/CommandManager/interfaces/CommandDefinition';

export class BentocordBento implements Command {
	public name = 'bento';
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