import { ComponentAPI } from '@ayanaware/bento';
import { ArgumentType, Command, CommandContext, CommandDefinition, CommandManager } from '@ayanaware/bentocord';

export class ArgTest implements Command {
	public name = 'ArgTest';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['argtest'],
		args: [{
			type: ArgumentType.MEMBER, name: 'target', rest: true,
			prompt: { startText: 'Please type the name of a Member:' },
			unresolved: 'Failed to find a target user.'
		}]
	};

	public async execute(ctx: CommandContext) {
		const target = ctx.args.target;
		if (!target) return ctx.messenger.createMessage(`Syntax: \`${ctx.alias} user\``);

		return ctx.messenger.createMessage(`You Targeted: ${target.username}`);
	}
}