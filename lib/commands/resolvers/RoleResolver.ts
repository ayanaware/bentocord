import { ApplicationCommandOptionType } from 'discord-api-types';
import { Role } from 'eris';

import { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import { CommandOption } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export class RoleResolver implements Resolver<Role> {
	public option = OptionType.ROLE;
	public convert = ApplicationCommandOptionType.Role;

	public async reduce(ctx: CommandContext, option: CommandOption<Role>, role: Role): Promise<{ display: string, extra?: string }> {
		return { display: `@${role.name}`, extra: role.id };
	}

	public async resolve(ctx: CommandContext, option: CommandOption<Role>, input: string): Promise<Array<Role>> {
		const guild = ctx.guild;
		if (!guild) return null;

		const roles = guild.roles;

		return Array.from(roles.filter(r => this.checkRole(input, r)).values());
	}

	private checkRole(input: string, role: Role) {
		if (role.id === input) return true;

		// handle mention
		const id = /^<@&(\d{17,19})>$/i.exec(input);
		if (id && role.id === id[1]) return true;

		// handle name
		input = input.replace(/^@/, '');

		return role.name.toLowerCase().includes(input.toLowerCase());
	}
}