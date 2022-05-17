import { ComponentAPI } from '@ayanaware/bento';
import { AnyCommandContext, CommandDefinition, CommandEntity, CommandManager, OptionType, SuppressorType } from '@ayanaware/bentocord';

export class NumberCommand implements CommandEntity {
	public name = 'numberCommnad';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition = {
		name: ['num', 'ber'],
		description: 'add two numbers',
		options: [
			{ type: OptionType.INTEGER, name: 'first', description: 'first number' },
			{ type: OptionType.INTEGER, name: 'second', description: 'second number' },
		],
		allowDM: false,
	} as CommandDefinition;

	public async execute(ctx: AnyCommandContext, { first, second }: { first: number, second: number }) {
		return ctx.createResponse(`${first} + ${second} = ${first + second}`);
	}
}