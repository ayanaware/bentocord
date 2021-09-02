import { ComponentAPI } from '@ayanaware/bento';
import { CommandContext, CommandDefinition, CommandEntity, CommandManager } from '@ayanaware/bentocord';
import { OptionType } from '@ayanaware/bentocord/commands/constants/OptionType';

export class SayCommand implements CommandEntity {
	public name = 'sayCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['say', 'echo'],
		description: 'Simon says repeat after me',
		options: [
			{ type: OptionType.STRING, name: 'text', description: 'text to repeat', rest: true, required: true, },
		],
	};

	public async execute(ctx: CommandContext, options: { text: string }) {
		return ctx.createResponse({ content: options.text });
	}
}
