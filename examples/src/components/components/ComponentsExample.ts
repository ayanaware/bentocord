import { ComponentAPI, Inject } from '@ayanaware/bento';
import { AnyCommandContext, Button, ButtonContext, CommandDefinition, CommandEntity, CommandManager, ComponentContext, ComponentOperation, ComponentsManager, Select, SelectContext } from '@ayanaware/bentocord';

export class Componentexample implements CommandEntity {
	public name = 'ComponentExample';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		name: ['components', 'comp'],
		description: 'hello components'
	};

	public async execute(ctx: AnyCommandContext): Promise<any> {
		const op = new ComponentOperation(ctx).setRows([[
			// First Button
			new Button(ctx, 'first', async (btn: ButtonContext) => {
				await btn.deferUpdate();

				// update rows & content
				await op.setRows([[await new Button(ctx, 'who_cares').labelTranslated('TRANSLATED_LABEL', null, 'Who Cares')]])
					.contentTranslated('TRANSLATED_EDIT', null, 'Edit go brr')

				// re-render operation
				await op.render();
			}).primary().label('First'),

			// Second Button
			new Button(ctx, 'second', async (btn: ButtonContext) => {
				await btn.deferUpdate();
				await btn.createResponse('Boo!');
			}).secondary().emoji({ name: '2️⃣' })

		], [ // Second row
			// Select
			new Select(ctx, 'select', async (slt: SelectContext) => {
				await slt.deferUpdate();

				await op.content(JSON.stringify(slt.data.values)).render();
			}).addOptions([{ label: 'Juan', value: '1' }, { label: 'Two', value: '2' }, { label: 'Three', value: '3' }]).max(2),
		]]).content('Hello Components!');
		op.timeoutSeconds = 5;

		await op.start();
	}
}