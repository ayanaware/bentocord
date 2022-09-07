import { ComponentAPI } from '@ayanaware/bento';
import { AnyCommandContext, CommandDefinition, CommandEntity, CommandManager } from '@ayanaware/bentocord';

export class HelloWorld implements CommandEntity {
	public name = 'HelloWorld';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		name: ['hello'],
		description: 'Hello world',
	};

	public async execute(ctx: AnyCommandContext) {
		return ctx.createResponse('Hello World!');
	}
}
