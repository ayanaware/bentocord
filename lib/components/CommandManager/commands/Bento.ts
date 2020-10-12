import { Bentocord } from "../../../Bentocord";
import { CodeblockBuilder } from '../../../builders';
import { Command, CommandAPI } from "../Command";
import { CommandContext } from "../CommandContext";
import { CommandManager } from "../CommandManager";

export class BentocordBento implements Command {
	public name = 'bentocordBento';
	public api!: CommandAPI;
	public parent = CommandManager;

	public aliases = ['bento', 'bentocord'];

	public async execute(ctx: CommandContext) {
		const channel = ctx.channel;

		const builder = new CodeblockBuilder();
		builder.addLine('Bento Version', this.api.getBentoVersion());
		builder.addLine('Bentocord Version', this.api.getEntity(Bentocord).version);

		await channel.createMessage(await builder.render());
		
		return;
	}
}