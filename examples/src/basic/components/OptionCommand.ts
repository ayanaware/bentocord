import { ComponentAPI } from '@ayanaware/bento';
import { ArgumentType, Command, CommandContext, CommandDefinition, CommandManager } from '@ayanaware/bentocord';

export class OptionTest implements Command {
	public name = 'OptionTest';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['optiontest'],
		args: [
			{ type: ArgumentType.BOOLEAN, name: 'bool', option: 'mybool' },
			{ type: ArgumentType.NUMBER, name: 'number', option: 'mynumber' },
			{
				type: ArgumentType.STRINGS, name: 'strings', option: 'mystrings', rest: true, phraseSeperators: [',', ';', ' '],
				prompt: { startText: 'Please type strings' },
			}
		]
	};

	public async execute(ctx: CommandContext) {
		const strings = ctx.args.strings;
		if (!strings) return ctx.messenger.createMessage(`Syntax: \`${ctx.alias} bool number string1, string2, ...\``);

		return ctx.messenger.createMessage(`${ctx.args.bool} ${ctx.args.number} ${strings.join(', ')}`);
	}
}
