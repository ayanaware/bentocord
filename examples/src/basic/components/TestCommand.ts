import { ComponentAPI } from '@ayanaware/bento';
import { ArgumentType, Command, CommandContext, CommandDefinition, CommandManager } from '@ayanaware/bentocord';

export class ArgTest implements Command {
	public name = 'ArgTest';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['argtest'],
		args: [
			{ type: ArgumentType.MEMBERS, name: 'target' },
		]
	};

	public async execute(ctx: CommandContext) {
		const target = ctx.args.target;
		if (!target) return ctx.messenger.createMessage(`Syntax: \`${ctx.alias} user\``);

		return ctx.messenger.createMessage(`You Targeted: ${target.map((t: any) => t.username).join(' ')}`);
	}
}