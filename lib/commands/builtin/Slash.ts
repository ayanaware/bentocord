import { ComponentAPI, Inject } from '@ayanaware/bento';

import { CommandContext } from '../CommandContext';
import { CommandManager, SyncOptions } from '../CommandManager';
import { OptionType } from '../constants/OptionType';
import { SuppressorType } from '../constants/SuppressorType';
import { CommandDefinition } from '../interfaces/CommandDefinition';
import { CommandEntity } from '../interfaces/entity/CommandEntity';

export class SlashCommand implements CommandEntity {
	public name = '@ayanaware/bentocord:Slash';
	public api!: ComponentAPI;
	public parent = CommandManager;

	@Inject() private readonly cm: CommandManager;

	public definition: CommandDefinition = {
		aliases: ['slash', 'manageslash'],
		description: 'manage slash commands',
		options: [
			{ type: OptionType.SUB_COMMAND, name: 'resync', description: 'resync slash commands', options: [
				{ type: OptionType.STRING, name: 'guild', description: 'optional guild', required: false },
				{ type: OptionType.STRING, name: 'prefix', description: 'optional prefix', required: false },
			] },
			{ type: OptionType.SUB_COMMAND, name: 'purge', description: 'purge slash commands from api', options: [
				{ type: OptionType.STRING, name: 'guild', description: 'optional guild', required: false },
				{ type: OptionType.STRING, name: 'prefix', description: 'optional prefix', required: false },
			] },
		],
		suppressors: [SuppressorType.BOT_OWNER],
		registerSlash: false,
		hidden: true,
	};

	public async execute(ctx: CommandContext, options: {
		resync?: { guild?: string, prefix?: string },
		purge?: { guild?: string, prefix?: string },
	}): Promise<any> {
		if (options.resync) {
			const resync = options.resync;

			let commands = await this.cm.convertCommands();
			if (resync.prefix) commands = commands.map(c => ({ ...c, name: `${resync.prefix}${c.name}` }));

			const opts: SyncOptions = { delete: resync.prefix ? resync.prefix : true };
			if (resync.guild) opts.guildId = resync.guild;

			await this.cm.syncCommands(commands, opts);

			return ctx.createResponse('Sync successful');
		} else if (options.purge) {
			const purge = options.purge;

			const opts: SyncOptions = { delete: purge.prefix ? purge.prefix : true };
			if (purge.guild) opts.guildId = purge.guild;

			await this.cm.syncCommands([], opts);

			return ctx.createResponse('Purge successful');
		}
	}
}
