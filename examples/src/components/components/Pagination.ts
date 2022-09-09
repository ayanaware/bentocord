import { ComponentAPI } from '@ayanaware/bento';
import { AnyCommandContext, CommandDefinition, CommandEntity, CommandManager } from '@ayanaware/bentocord';

export class PaginationTest implements CommandEntity {
	public name = 'paginationtest';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		name: ['pagination'],
		description: 'Pagination Test',
	};

	public async execute(ctx: AnyCommandContext, options?: Record<string, unknown>): Promise<any> {
		// build dummy data
		const items: Array<string> = [];
		for (let i = 0; i < 500; i++) {
			items.push(i.toString());
		}

		const result = await ctx.confirm('Please Confirm:', items);
		return ctx.createMessage(result.toString())
	}
}
