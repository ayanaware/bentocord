import { ComponentAPI, Inject } from "@ayanaware/bento";
import { TextChannel } from 'eris';

import { Command, CommandDefinition } from '../interfaces';
import { CommandManager } from '../CommandManager';
import { CommandContext } from '../CommandContext';
import { ArgumentMatch, ArgumentType } from '../../arguments';


export class Prefix implements Command {
	public name = 'prefix';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['prefix', 'pfx'],
		args: [
			{ name: 'prefix', type: ArgumentType.STRING, match: ArgumentMatch.REST }
		]
	};

	@Inject(CommandManager) public commandManager: CommandManager;

	public async execute(ctx: CommandContext<TextChannel>) {
		if (!ctx.guild) return ctx.messenger.createMessage(`This command can only be run in a Guild`);

		// handle `prefix set`
		if (ctx.args.prefix) return this.set(ctx);

		const prefix = await this.commandManager.getPrefix(ctx.guild.id);
		return ctx.messenger.createMessage(`This Guild's prefix is \`${prefix}\`.`);
	}

	private async set(ctx: CommandContext<TextChannel>) {
		// TODO: add permission check
		const newPrefix = ctx.args.prefix;
		await this.commandManager.setPrefix(ctx.guild.id, newPrefix);

		return ctx.messenger.createMessage(`This Guild's prefix has been set to \`${newPrefix}\``);
	}
}