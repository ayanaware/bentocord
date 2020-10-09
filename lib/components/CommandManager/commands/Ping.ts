import { Command, CommandAPI } from "../Command";
import { CommandContext } from "../CommandContext";
import { CommandManager } from "../CommandManager";

export class BentocordPing implements Command {
	public name = 'bentocordPing';
	public api!: CommandAPI;
	public parent = CommandManager;

	public aliases = ['ping', 'pong'];

	public async execute(ctx: CommandContext) {
		const channel = ctx.channel;
		await channel.createMessage('Pong!');

		return;
	}
}