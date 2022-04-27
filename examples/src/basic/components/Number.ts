import { ComponentAPI } from '@ayanaware/bento';
import { CommandContext, CommandDefinition, CommandEntity, CommandManager, OptionType, SuppressorType } from '@ayanaware/bentocord';

export class NumberCommand implements CommandEntity {
	public name = 'numberCommnad';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition = {
		name: ['num', 'ber'],
		description: 'add two numbers',
		options: [
			{ type: OptionType.NUMBER, name: 'first', description: 'first number' },
			{ type: OptionType.NUMBER, name: 'second', description: 'second number' },
		],

		suppressors: [SuppressorType.GUILD]
	} as CommandDefinition;

	public async execute(ctx: CommandContext, { first, second }: { first: number, second: number }) {
		return ctx.createResponse(`${first} + ${second} = ${first + second}`);
	}
}