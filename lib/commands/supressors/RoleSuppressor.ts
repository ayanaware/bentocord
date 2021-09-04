import { CommandContext } from '../CommandContext';
import { SuppressorType } from '../constants/SuppressorType';
import { Suppressor, SuppressorOption } from '../interfaces/Suppressor';

export class RoleSuppressor implements Suppressor {
	public suppressor = SuppressorType.ROLE;

	public async suppress(ctx: CommandContext, option: SuppressorOption, roleIds?: Array<string>, all = false): Promise<string | false> {
		if (!Array.isArray(roleIds)) return false;
		if (!ctx.member) return false;

		const memberRoleIds = ctx.member.roles;

		let result = false;
		if (all) result = roleIds.every(r => memberRoleIds.includes(r));
		else result = roleIds.some(r => memberRoleIds.includes(r));

		return result ? false : 'You do not have the required role(s)';
	}
}
