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

		const message = await ctx.formatTranslation('BENTOCORD_SUPPRESSOR_ROLE') || 'You do not possess the required roles.';
		return result ? false : message;
	}
}
