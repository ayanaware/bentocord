import { ComponentAPI, Inject } from "@ayanaware/bento";
import { TextChannel } from 'eris';

import { Command, CommandDefinition } from '../interfaces';
import { CommandManager } from '../CommandManager';
import { CommandContext } from '../CommandContext';


export class Prefix implements Command {
	public name = 'prefix';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['prefix', 'pfx'],
	};

	@Inject(CommandManager) public commandManager: CommandManager;

	public async execute(ctx: CommandContext<TextChannel>) {
		if (!ctx.guild) return ctx.messenger.createMessage(`This command can only be run in a Guild`);

		// handle `prefix set`
		const arg = ctx.nextArg();
		if (arg == 'set') return this.set(ctx);

		const prefix = await this.commandManager.getPrefix(ctx.guild.id);
		return ctx.messenger.createMessage(`This Guild's prefix is \`${prefix}\`.`);
	}

	private async set(ctx: CommandContext<TextChannel>) {
		// TODO: add permission check
		const newPrefix = ctx.remainingArgs().join(' ');
		await this.commandManager.setPrefix(ctx.guild.id, newPrefix);

		return ctx.messenger.createMessage(`This Guild's prefix has been set to \`${newPrefix}\``);
	}
}