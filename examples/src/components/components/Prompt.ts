import { ComponentAPI } from '@ayanaware/bento';
import { AnyCommandContext, CommandDefinition, CommandEntity, CommandManager } from '@ayanaware/bentocord';

export class PromptTest implements CommandEntity {
	public name = 'prompttest';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		name: ['prompt'],
		description: 'Test updated component prompts',
	};

	public async execute(ctx: AnyCommandContext): Promise<any> {
		const confirm = await ctx.confirm('Are you sure?!');
		return ctx.createResponse(confirm.toString());


		const input = await ctx.prompt('Please enter something:', async (response: string) => ['yes', 'no'].includes(response) ? response : null);
		return ctx.createResponse(`You Said: ${input}`);
	}
}