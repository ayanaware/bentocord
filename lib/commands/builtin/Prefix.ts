import { TextChannel } from 'eris';

import { ComponentAPI, Inject } from "@ayanaware/bento";

import { ArgumentType } from '../../arguments';

import { CommandDefinition, CommandEntity } from '../interfaces';
import { CommandManager } from '../CommandManager';
import { CommandContext } from '../CommandContext';

export class PrefixCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:PrefixCommand';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['prefix', 'pfx'],
		args: [
			{ type: ArgumentType.STRING, name: 'prefix', rest: true, optional: true }
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