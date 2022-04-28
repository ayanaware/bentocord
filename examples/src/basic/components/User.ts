import { ComponentAPI } from '@ayanaware/bento';
import { CommandContext, CommandDefinition, CommandEntity, CommandManager } from '@ayanaware/bentocord';
import { OptionType } from '@ayanaware/bentocord/commands/constants/OptionType';
import { User } from 'eris';

export class UserTest implements CommandEntity {
	public name = 'usertest';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		name: ['usertest'],
		description: 'Test away all day',
		options: [
			{ type: OptionType.USER, array: true, name: 'users', description: 'users', rest: true, required: false },
			{ type: OptionType.USER, name: 'user', description: 'user', required: false },
		],
	};

	public async execute(ctx: CommandContext, { users, user }: { users: Array<User>, user: User }) {
		if (!users) users = [];
		if (user) users.push(user)

		return ctx.createResponse({ content: `selected users = ${users.map(u => `${u.username}#${u.discriminator}`).join(', ')}` });
	}
}
