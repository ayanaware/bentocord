/* eslint-disable @typescript-eslint/naming-convention */
import { Constants, Emoji } from 'eris';

import { AnyCommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import type { CommandOptionValue } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export type EmojiOption = CommandOptionValue<OptionType.EMOJI, Emoji>;

export class EmojiOptionResolver implements Resolver<Emoji> {
	public option = OptionType.EMOJI;
	public convert = Constants.ApplicationCommandOptionTypes.STRING;

	async reduce(ctx: AnyCommandContext, option: EmojiOption, emoji: Emoji): Promise<{ display: string, extra?: string }> {
		return { display: emoji.name };
	}

	async resolve(ctx: AnyCommandContext, option: EmojiOption, input: string): Promise<Emoji | Array<Emoji>> {
		const guild = ctx.guild;
		if (!guild) return null;

		// guild emojis
		const emojis: Array<Emoji> = guild.emojis.filter(e => this.checkEmoji(input, e));

		// unicode
		const unicode = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/.exec(input);
		if (unicode) return { id: null, name: unicode[1], require_colons: false, animated: false, available: true, managed: false, roles: [] };

		return emojis;
	}

	private checkEmoji(input: string, emoji: Emoji): boolean {
		if (emoji.id === input) return true;

		// handle usage
		const custom = /^<(?<a>a)?:(?<name>[a-zA-Z0-9_]+):(?<id>\d{17,19})>$/.exec(input);
		if (custom && custom.groups.id === emoji.id) return true;

		// handle name
		input = input.replace(/:/g, '');

		return emoji.name.toLocaleLowerCase().includes(input.toLocaleLowerCase());
	}
}
