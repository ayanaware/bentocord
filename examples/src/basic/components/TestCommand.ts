import { ComponentAPI } from '@ayanaware/bento';
import { ArgumentType, Command, CommandContext, CommandDefinition, CommandManager } from '@ayanaware/bentocord';

export class ArgTest implements Command {
	public name = 'ArgTest';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['argtest'],
		args: [{
			type: ArgumentType.STRINGS, name: 'target', rest: true, phraseSeperators: [',', ';'],
			choices: ['a', 'b', 'c'],
			prompt: { startText: 'Please type strings' },
			unresolved: 'Failed to find valid strings',
		}],
	};

	public async execute(ctx: CommandContext) {
		const target = ctx.args.target;
		if (!target) return ctx.messenger.createMessage(`Syntax: \`${ctx.alias} string1, string2, ...\``);

		return ctx.messenger.createMessage(`Your strings: ${target.join(', ')}`);
	}
}
