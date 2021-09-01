import { ComponentAPI } from '@ayanaware/bento';
import { CommandContext, CommandDefinition, CommandEntity, CommandManager } from '@ayanaware/bentocord';
import { OptionType } from '@ayanaware/bentocord/commands/constants/OptionType';
import { User } from 'eris';

export class UserTest implements CommandEntity {
	public name = 'usertest';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['usertest'],
		description: 'Test away all day',
		options: [
			{ type: OptionType.USER, name: 'user', description: 'user', rest: true, required: true },
		],
	};

	public async execute(ctx: CommandContext, options: { user: User }) {
		return ctx.createResponse({ content: `selected users = ${options.user.username}#${options.user.discriminator}` });
	}
}
