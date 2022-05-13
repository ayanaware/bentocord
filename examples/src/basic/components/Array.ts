import { ComponentAPI } from '@ayanaware/bento';
import { CommandContext, CommandDefinition, CommandEntity, CommandManager } from '@ayanaware/bentocord';
import { OptionType } from '@ayanaware/bentocord/commands/constants/OptionType';

export class ArrayCommand implements CommandEntity {
	public name = 'arraytest';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		name: ['arraytest'],
		description: 'Test away all day',
		options: [
			{ type: OptionType.BOOLEAN, array: true, name: 'booleans', description: 'booleans', required: true },
			{ type: OptionType.INTEGER, array: true, name: 'numbers', description: 'numbers', required: true },
		],
	};

	public async execute(ctx: CommandContext, options: { booleans: Array<boolean>, numbers: Array<number> }) {
		return ctx.createResponse({ content: `booleans = ${options.booleans.join(', ')}. numbers = ${options.numbers.join(', ')}` });
	}
}
