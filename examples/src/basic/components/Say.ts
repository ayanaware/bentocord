import { ComponentAPI } from '@ayanaware/bento';
import { AnyCommandContext, CommandDefinition, CommandEntity, CommandManager } from '@ayanaware/bentocord';
import { OptionType } from '@ayanaware/bentocord/commands/constants/OptionType';

export class SayCommand implements CommandEntity {
	public name = 'sayCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		name: ['say', 'echo'],
		description: 'Simon says repeat after me',
		options: [
			{ type: OptionType.STRING, name: 'text', description: 'text to repeat', rest: true, required: true },
			{ type: OptionType.EMOJI, name: 'emoji', description: 'emoji test' }
		],
	};

	public async execute(ctx: AnyCommandContext, options: { text: string }) {
		console.log(options);
		if (!await ctx.confirm(`Say \`${options.text}\`[y/n]?`)) return;

		return ctx.createResponse({ content: options.text });
	}
}
