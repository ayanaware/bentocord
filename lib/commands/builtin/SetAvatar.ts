import * as https from 'https';

import { ComponentAPI, Inject } from '@ayanaware/bento';

import { Discord } from '../../discord/Discord';
import { AnyCommandContext } from '../CommandContext';
import { CommandManager } from '../CommandManager';
import { OptionType } from '../constants/OptionType';
import { SuppressorType } from '../constants/SuppressorType';
import { CommandDefinition } from '../interfaces/CommandDefinition';
import { CommandEntity } from '../interfaces/entity/CommandEntity';

export class SetAvatarCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:SetAvatarCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;
	public replaceable = true;

	@Inject() protected readonly discord: Discord;

	public definition: CommandDefinition = {
		name: ['setavatar', { key: 'BENTOCORD_COMMAND_SETAVATAR' }],
		description: { key: 'BENTOCORD_COMMAND_SETAVATAR_DESCRIPTION', backup: 'Set the bot\'s avatar' },
		options: [
			{ type: OptionType.STRING, name: 'url', description: { key: 'BENTOCORD_OPTION_URL', backup: 'The avatar to set' } },
		],

		hidden: true,
		registerSlash: false,

		permissionDefaults: { user: false, admin: false },
		suppressors: [SuppressorType.BOT_OWNER],
	};

	public async execute(ctx: AnyCommandContext, { url }: { url: string }): Promise<void> {
		// TODO: Check if the url is a valid image url
		await ctx.createTranslatedResponse('BENTOCORD_AVATAR_UPDATING', {}, 'Updating avatar...');

		return new Promise((resolve, reject) => {
			https.get(url, res => {
				if (res.statusCode !== 200) return reject(new Error(`Invalid status code: ${res.statusCode}`));

				// expected to be binary image data
				res.setEncoding('binary');

				const data: Array<Buffer> = [];
				res.on('data', chunk => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					data.push(Buffer.from(chunk, 'binary'));
				});

				res.on('end', () => {
					const type = res.headers['content-type'] ?? 'image/png';
					const buffer = Buffer.concat(data);
					const avatar = `data:${type};base64,${buffer.toString('base64')}`;

					this.discord.client.editSelf({ avatar }).then(() => {
						ctx.createTranslatedResponse('BENTOCORD_AVATAR_UPDATED', {}, 'Avatar updated!')
							.then(() => resolve).catch(reject);
					}).catch(reject);
				});
			}).on('error', e => reject(e));
		});
	}
}
