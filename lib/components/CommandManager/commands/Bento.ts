import { ComponentAPI } from '@ayanaware/bento';
import { Bentocord } from "../../../Bentocord";
import { CodeblockBuilder } from '../../../builders';
import { Command } from "../Command";
import { CommandContext } from "../CommandContext";
import { CommandManager } from "../CommandManager";

export class BentocordBento implements Command {
	public name = 'bentocordBento';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public aliases = ['bento', 'bentocord'];

	public async execute(ctx: CommandContext) {
		const builder = new CodeblockBuilder();
		builder.addLine('Bento Version', this.api.getBentoVersion());
		builder.addLine('Bentocord Version', this.api.getEntity(Bentocord).version);

		return ctx.messenger.createMessage(await builder.render());
	}
}