import { CommandContext } from '../CommandContext';
import { SuppressorType } from '../constants/SuppressorType';
import { Suppressor, SuppressorOption } from '../interfaces/Suppressor';

export class UserSuppressor implements Suppressor {
	public suppressor = SuppressorType.USER;

	public async suppress(ctx: CommandContext, option: SuppressorOption, userIds?: Array<string>): Promise<string | false> {
		if (!Array.isArray(userIds)) return false;

		return userIds.includes(ctx.authorId) ? false : 'User is not a member of list';
	}
}
