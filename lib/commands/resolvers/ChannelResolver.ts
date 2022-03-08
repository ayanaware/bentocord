import { AnyGuildChannel, Constants } from 'eris';

import { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import { CommandOptionChannel } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export class ChannelResolver implements Resolver<AnyGuildChannel> {
	public option = OptionType.CHANNEL;
	public convert = Constants.ApplicationCommandOptionTypes.CHANNEL;

	public async reduce(ctx: CommandContext, option: CommandOptionChannel, channel: AnyGuildChannel): Promise<{ display: string, extra?: string }> {
		return { display: `#${channel.name}`, extra: channel.id };
	}

	public async resolve(ctx: CommandContext, option: CommandOptionChannel, input: string): Promise<AnyGuildChannel | Array<AnyGuildChannel>> {
		const guild = ctx.guild;
		if (!guild) return null;

		const channels = ctx.guild.channels;

		const filter = Array.from(channels.filter(c => this.checkChannel(input, c)).values());
		if (filter.length > 0) return filter;

		return Array.from(channels.values());
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
