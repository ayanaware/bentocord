import { Constants, Role } from 'eris';

import { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import type { CommandOptionValue } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export type RoleOption = CommandOptionValue<OptionType.ROLE, Role>;

export class RoleOptionResolver implements Resolver<Role> {
	public option = OptionType.ROLE;
	public convert = Constants.ApplicationCommandOptionTypes.ROLE;

	public async reduce(ctx: CommandContext, option: RoleOption, role: Role): Promise<{ display: string, extra?: string }> {
		return { display: `@${role.name}`, extra: role.id };
	}

	public async resolve(ctx: CommandContext, option: RoleOption, input: string): Promise<Array<Role>> {
		const guild = ctx.guild;
		if (!guild) return null;

		const roles = guild.roles;

		// Attempt filter
		const filter = Array.from(roles.filter(r => this.checkRole(input, r)).values());
		if (filter.length > 0) return filter;

		return Array.from(roles.values());
	}

	private checkRole(input: string, role: Role) {
		if (role.id === input) return true;

		// handle mention
		const id = /^<@&(\d{17,19})>$/i.exec(input);
		if (id && role.id === id[1]) return true;

		// handle name
		input = input.replace(/^@/, '');

		return role.name.toLocaleLowerCase().includes(input.toLocaleLowerCase());
	}
}
