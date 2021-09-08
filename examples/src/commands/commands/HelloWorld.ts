import { ComponentAPI } from '@ayanaware/bento';
import { CommandContext, CommandDefinition, CommandEntity, CommandManager } from '@ayanaware/bentocord';

export class HelloWorld implements CommandEntity {
	public name = 'HelloWorld';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['hello'],
		description: 'Hello world',
	};

	public async execute(ctx: CommandContext) {
		return ctx.createResponse('Hello World!');
	}
}
