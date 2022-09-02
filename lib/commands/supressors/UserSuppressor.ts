import { AnyCommandContext } from '../CommandContext';
import { SuppressorType } from '../constants/SuppressorType';
import { Suppressor, SuppressorOption } from '../interfaces/Suppressor';

export class UserSuppressor implements Suppressor {
	public suppressor = SuppressorType.USER;

	public async suppress(ctx: AnyCommandContext, option: SuppressorOption, userIds?: Array<string>): Promise<string | false> {
		if (!Array.isArray(userIds)) return false;

		const message = await ctx.formatTranslation('BENTOCORD_SUPPRESSOR_USER_DENIED', {}, 'You are not allowed to execute this command.');
		return userIds.includes(ctx.userId) ? false : message;
	}
}
