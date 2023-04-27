import { AnyGuildChannel, Constants } from 'eris';

import { AnyCommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import { AnyValueCommandOption, CommandOptionValue } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export interface ChannelOption extends CommandOptionValue<OptionType.CHANNEL> {
	channelTypes?: Array<Constants['ChannelTypes'][keyof Constants['ChannelTypes']]>;
}
export class ChannelOptionResolver implements Resolver<AnyGuildChannel> {
	public option = OptionType.CHANNEL;
	public convert = Constants.ApplicationCommandOptionTypes.CHANNEL;

	public async reduce(ctx: AnyCommandContext, option: ChannelOption, channel: AnyGuildChannel): Promise<{ display: string, extra?: string }> {
		return { display: `#${channel.name}`, extra: channel.id };
	}

	public async resolve(ctx: AnyCommandContext, option: ChannelOption, input: string): Promise<AnyGuildChannel | Array<AnyGuildChannel>> {
		const guild = ctx.guild;
		if (!guild) return null;

		const channels = ctx.guild.channels;

		const channelTypes = option.channelTypes ?? [];

		// filter matching channelType
		const find = Array.from(channels.filter(c => this.checkChannel(input, c)).filter(c => channelTypes.length === 0 || channelTypes.includes(c.type)).values());
		if (find.length > 0) return find;

		return Array.from(channels.filter(c => channelTypes.length === 0 || channelTypes.includes(c.type)).values());
	}

	private checkChannel(input: string, channel: AnyGuildChannel) {
		if (channel.id === input) return true;

		// handle mention
		const id = /^<#(\d{17,19})>$/i.exec(input);
		if (id && channel.id === id[1]) return true;

		// handle name
		input = input.replace(/^#/, '');
		return channel.name.toLocaleLowerCase().includes(input.toLocaleLowerCase());
	}

	public async help(ctx: AnyCommandContext, option: AnyValueCommandOption, data: Map<string, string>): Promise<Map<string, string>> {
		if ('channelTypes' in option) {
			// find channel names
			const names: Array<string> = [];
			for (const channelType of option.channelTypes) {
				for (const [name, id] of Object.entries(Constants.ChannelTypes)) {
					if (id !== channelType) continue;

					names.push(name);
					break;
				}
			}

			data.set(await ctx.formatTranslation('BENTOCORD_WORD_CHANNELTYPES', {}, 'Channel Types'), names.map(n => `\`${n}\``).join(' '));
		}

		return data;
	}
}
