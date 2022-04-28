import { ComponentAPI } from '@ayanaware/bento';
import { CommandContext, CommandDefinition, CommandEntity, CommandManager, OptionType, SuppressorType } from '@ayanaware/bentocord';
import { Role } from 'eris';

export class RoleTest implements CommandEntity {
	public name = 'roleTest';
	public api!: ComponentAPI;
	public parent = CommandManager;

	private roles: Set<string> = new Set();

	public definition = {
		name: ['roletest'],
		description: 'asdfasdf',
		options: [
			{ type: OptionType.SUB_COMMAND, name: 'private', description: 'WHITELISTONLY', suppressors: [{ type: SuppressorType.ROLE, args: this.getRoles.bind(this) }] },
			{ type: OptionType.SUB_COMMAND, name: 'whitelist', description: 'add role to whitelist', options: [
				{ type: OptionType.ROLE, name: 'role', description: 'the role' }
			] },
		],
	} as CommandDefinition;

	private getRoles() {
		console.log('asdfasdfasdf', this);

		return [Array.from(this.roles.values()), false];
	}

	public async execute(ctx: CommandContext, options: { whitelist: { role: Role } }) {
		if (options.whitelist) {
			this.roles.add(options.whitelist.role.id)

			return ctx.createResponse(`Added \`${options.whitelist.role.name}\` to the whitelist`);
		}

		return ctx.createResponse('OOO u specccial');
	}
}