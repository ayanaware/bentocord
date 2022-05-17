import { AnyGuildChannel, Constants } from 'eris';

import { AnyCommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import { CommandOptionValue } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export interface ChannelOption extends CommandOptionValue<OptionType.CHANNEL> {
	channelTypes?: Array<Constants['ChannelTypes'][keyof Constants['ChannelTypes']]>;
}

// Common channel types helper
export const AllTextChannelTypes = [
	Constants.ChannelTypes.GUILD_TEXT,
	Constants.ChannelTypes.DM,
	Constants.ChannelTypes.GROUP_DM,
	Constants.ChannelTypes.GUILD_NEWS,
	Constants.ChannelTypes.GUILD_STORE,
	Constants.ChannelTypes.GUILD_NEWS_THREAD,
	Constants.ChannelTypes.GUILD_PUBLIC_THREAD,
	Constants.ChannelTypes.GUILD_PRIVATE_THREAD,
];

export const AllVoiceChannelTypes = [
	Constants.ChannelTypes.GUILD_VOICE,
	Constants.ChannelTypes.GUILD_STAGE_VOICE,
];

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
}
