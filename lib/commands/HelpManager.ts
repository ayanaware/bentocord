import { ComponentAPI, Inject } from '@ayanaware/bento';

import { PromptChoice } from '../prompt/prompts/ChoicePrompt';

import { CommandContext } from './CommandContext';
import { CommandManager } from './CommandManager';
import { OptionType } from './constants/OptionType';
import { CommandDefinition } from './interfaces/CommandDefinition';
import { AnyCommandOption, AnySubCommandOption, } from './interfaces/CommandOption';
import { CommandEntity } from './interfaces/entity/CommandEntity';

export class HelpManager implements CommandEntity {
	public name = '@ayanaware/bentocord:HelpManager';
	public api!: ComponentAPI;
	public parent = CommandManager;

	@Inject() private readonly commandManager: CommandManager;

	public definition: CommandDefinition = {
		name: ['help', 'commands'],
		description: 'Bentocord Help',
		options: [
			{ name: 'input', type: OptionType.STRING, description: 'Command, category, or help page', rest: true, required: false },
		],
	};

	private getTypePreview(option: AnyCommandOption) {
		// Prepend type information to description
		let typeBuild = '[';
		if (typeof option.type === 'number') typeBuild += OptionType[option.type];
		else typeBuild += option.type;

		// handle array
		if ('array' in option && option.array) typeBuild += ', ...';
		typeBuild += ']';

		return typeBuild;
	}

	private async buildOptions(ctx: CommandContext, options: Array<AnyCommandOption>): Promise<Array<PromptChoice<string>>> {
		const items: Array<PromptChoice<string>> = [];
		for (const option of options) {
			const primary = this.commandManager.getPrimaryName(option.name);
			const type = this.getTypePreview(option);

			let description = option.description;
			if (typeof description === 'object') description = await ctx.formatTranslation(description.key, description.repl) || description.backup;

			items.push({ name: `${primary}${type} - ${description}`, value: primary, match: [primary] });
		}

		return items;
	}

	public async processCommand(ctx: CommandContext, command: CommandDefinition | AnySubCommandOption, args: Array<string>): Promise<unknown> {
		let definition = false;
		if ('aliases' in command) definition = true;

		const options = command.options || [];

		// if we have an arg attempt to find it
		const arg = args.shift();
		if (arg) {
			const option = options.find(o => o.name === arg);

			if ([OptionType.SUB_COMMAND, OptionType.SUB_COMMAND_GROUP].includes(option.type)) {
				return this.processCommand(ctx, option as AnySubCommandOption, args);
			}

			// return this.displayOption(ctx, option);
			return;
		}

		// no args to fufill, build list of options
		const items = await this.buildOptions(ctx, options);

		const primary = this.commandManager.getPrimaryName(command.name);

		let type = '';
		if (definition) type = '[COMMAND]';
		else type = this.getTypePreview(command as AnyCommandOption);

		let content = `${primary}${type} - ${command.description}`;

		const hasSub = options.find(o => [OptionType.SUB_COMMAND, OptionType.SUB_COMMAND_GROUP].includes(o.type));
		if (hasSub) {
			content += '\n\nPlease select a subcommand:';
		}

		// display choices
		const choice = await ctx.choice(items, content, { resolveOnClose: true });

		if (choice) {
			return this.processCommand(ctx, command, [choice]);
		}
	}

	public async execute(ctx: CommandContext, { input }: { input: string }): Promise<unknown> {
		const args = input.split(' ');
		const name = args.shift();
		// TODO: Check categories, pages, and then commands

		// find command
		const command = this.commandManager.findCommand(name);
		if (!command) return ctx.createResponse(await ctx.formatTranslation('BENTOCORD_ADV_NOTEXIST', { command: name }) || `Command "${name}" does not exist`);

		const definition = command.definition;

		return this.processCommand(ctx, definition, args);
	}
}
