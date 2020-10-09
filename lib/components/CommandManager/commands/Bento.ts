import { Bentocord } from "../../../Bentocord";
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

		let build = '```\n';
		build += `Bento Version     : ${this.api.getBentoVersion()}\n`;
		build += `Bentocord Version : ${this.api.getEntity(Bentocord).version || 'Error'}`;
		build += '```';

		await channel.createMessage(build);
		
		return;
	}
}