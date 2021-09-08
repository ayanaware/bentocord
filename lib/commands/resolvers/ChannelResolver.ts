import { ApplicationCommandOptionType } from 'discord-api-types';
import { AnyGuildChannel } from 'eris';

import { CommandContext } from '../CommandContext';
import { OptionType } from '../constants/OptionType';
import { CommandOption } from '../interfaces/CommandOption';
import { Resolver } from '../interfaces/Resolver';

export class ChannelResolver implements Resolver<AnyGuildChannel> {
	public option = OptionType.CHANNEL;
	public convert = ApplicationCommandOptionType.Channel;

	public async reduce(ctx: CommandContext, option: CommandOption<AnyGuildChannel>, channel: AnyGuildChannel): Promise<{ display: string, extra?: string }> {
		return { display: `#${channel.name}`, extra: channel.id };
	}

	public async resolve(ctx: CommandContext, option: CommandOption<AnyGuildChannel>, input: string): Promise<AnyGuildChannel | Array<AnyGuildChannel>> {
		const guild = ctx.guild;
		if (!guild) return null;

		const channels = ctx.guild.channels;

		return Array.from(channels.filter(c => this.checkChannel(input, c)).values());
	}

	private checkChannel(input: string, channel: AnyGuildChannel) {
		if (channel.id === input) return true;

		// handle mention
		const id = /^<#(\d{17,19})>$/i.exec(input);
		if (id && channel.id === id[1]) return true;

		// handle name
		input = input.replace(/^#/, '');
		return channel.name.toLowerCase().includes(input.toLowerCase());
	}
}