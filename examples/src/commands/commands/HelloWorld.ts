import { ComponentAPI } from '@ayanaware/bento';
import { Command, CommandContext, CommandDefinition, CommandManager } from '@ayanaware/bentocord';

export class HelloWorld implements Command {
	public name = 'HelloWorld';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['hello', 'helloworld'],
	};

	public async execute(ctx: CommandContext) {
		return ctx.messenger.createMessage('Hello World!');
	}
}