import * as util from 'util';

import { ComponentAPI, Entity, Inject } from '@ayanaware/bento';

import { CodeblockBuilder } from '../../builders';

import { CommandDefinition, CommandEntity } from '../interfaces';
import { CommandManager } from '../CommandManager';
import { CommandContext } from '../CommandContext';

import Logger from '@ayanaware/logger-api';
const log = Logger.get();

export class Eval implements CommandEntity {
	public name = 'eval';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		aliases: ['eval', 'hack'],
	};

	@Inject(CommandManager) private commandManager: CommandManager;

	public async execute(ctx: CommandContext) {
		// NOTE: __varname in this command is used to prevent clashes with eval code
		// no other command or module should follow this pattern
		// tslint:disable: variable-name

		// owner only
		if (!ctx.isOwner()) return ctx.messenger.createMessage(`You lack permission to perform this command.`);

		// eval help
		const __sendHelp = async () => {
			const __evalHelp = new CodeblockBuilder();
			__evalHelp.addLine('ctx', `Command Context`);

			__evalHelp.addLine('api', `This Command's ComponentAPI`)
			__evalHelp.addLine('getEntity(ref)', 'Get a Bento Entity');
			__evalHelp.addLine('getCommand(alias)', 'Attempt to get a Command by an alias');
			return ctx.messenger.createMessage(await __evalHelp.render(), null, { zws: false });
		}

		if (!ctx.raw) return __sendHelp();
		const __args = ctx.raw.trim().replace(/\n/g, ' ').split(' ').filter(v => !!v);
		if (__args.length === 0) return __sendHelp();

		const __evalOptions = {
			async: false,
			inspect: false,
		};

		// handle eval options ex: eval -a, eval -i
		if (__args[0].toLowerCase().startsWith('-')) {
			for (let i = 1; i < __args[0].length; i++) {
				switch (__args[0].charAt(i)) {
					case 'a':
						__evalOptions.async = true;
						break;
					case 'i':
						__evalOptions.inspect = true;
						break;
					default: /* NO-OP */ break;
				}
			}

			__args.shift();
		}

		const api = this.api;
		const getEntity = (ref: Entity | Function | string) => this.api.getEntity(ref);
		const getCommand = (alias: string) => {
			const command = this.commandManager.findCommandByAlias(alias);
			if (command == null) throw new Error(`Alias "${alias}" is not associated with any known command.`);

			return command;
		};

		const asyncTimeout = async (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout));

		const __evalMessage = await ctx.messenger.createMessage(`Executing eval...`, null, { zws: false });
		const __start = process.hrtime();

		const __resolve = async (result: any) => {
			const end = process.hrtime(__start);
			const time = `\`${end[0]}s ${end[1] / 1000000}ms\``;

			if (__evalOptions.inspect) result = util.inspect(result);

			try {
				return ctx.messenger.updateMessage(__evalMessage, `Execution Time: ${time}\n\n\`\`\`js\n${result}\`\`\``, { zws: false });
			} catch (e) {
				log.error(`Error updating eval message: ${e}`);
			}
		};

		const __reject = async (e: Error) => {
			try {
				return ctx.messenger.updateMessage(__evalMessage, `Error!\n\n\`\`\`js\n${util.inspect(e)}\`\`\``, { zws: false });
			} catch (e) {
				log.error(`Error updating eval message: ${e}`);
			}
		}

		const __evalCode = __args.join(' ');
		log.info(`Executing eval code:\n${__evalCode}`);
		if (__evalOptions.async) {
			try {
				// tslint:disable-next-line no-eval
				eval(`(async function() {${__evalCode}}).bind(this)().then(__resolve).catch(__reject)`);
			} catch (e) {
				return __reject(e);
			}
		} else {
			try {
				// tslint:disable-next-line no-eval
				await __resolve(eval(`${__evalCode}`));
			} catch (e) {
				return __reject(e);
			}
		}
	}
}