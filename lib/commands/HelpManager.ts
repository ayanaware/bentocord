import { ComponentAPI, Inject } from '@ayanaware/bento';

import { BentocordInterface } from '../BentocordInterface';
import { LocalizedEmbedBuilder } from '../builders/LocalizedEmbedBuilder';
import { Translateable } from '../interfaces/Translateable';
import { PromptChoice } from '../prompt/prompts/ChoicePrompt';

import { CommandContext } from './CommandContext';
import { CommandDetails, CommandManager } from './CommandManager';
import { OptionType } from './constants/OptionType';
import { CommandDefinition } from './interfaces/CommandDefinition';
import { AnyCommandOption, AnySubCommandOption, AnyValueCommandOption } from './interfaces/CommandOption';
import { CommandEntity } from './interfaces/entity/CommandEntity';

export class HelpManager implements CommandEntity {
	public name = '@ayanaware/bentocord:HelpManager';
	public api!: ComponentAPI;
	public parent = CommandManager;

	@Inject() private readonly interface: BentocordInterface;
	@Inject() private readonly cm: CommandManager;

	public definition: CommandDefinition = {
		name: ['help', { key: 'BENTOCORD_COMMAND_HELP' }],
		description: { key: 'BENTOCORD_COMMAND_HELP_DESCRIPTION', backup: 'Learn about commands and features the bot provides.' },
		options: [
			{ type: OptionType.STRING, name: 'input', description: { key: 'BENTOCORD_OPTION_HELP_INPUT_DESCRIPTION', backup: 'Category, Command, or Page' }, rest: true, required: false },
		],
	};

	public async execute(ctx: CommandContext, { input }: { input?: string }): Promise<unknown> {
		if (!input) return this.showPrimaryHelp(ctx);

		const args = input.split(' ');
		// first argument is command or category name
		const name = args.shift().toLocaleLowerCase();

		// handle commands
		const command = this.cm.findCommand(name);
		if (command) {
			return this.showCommandHelp(ctx, command.definition, args);
		}

		// handle categories
		for (const [category, commands] of this.cm.getCategorizedCommands()) {
			if (category.toLocaleLowerCase() !== name) continue;

			return this.showCategoryHelp(ctx, category, commands);
		}

		return ctx.createTranslatedResponse('BENTOCORD_HELP_NOT_FOUND', {}, 'Failed to find relevant help for input');
	}

	private async showPrimaryHelp(ctx: CommandContext): Promise<unknown> {
		// grab embed
		let embed = new LocalizedEmbedBuilder(ctx);
		embed = await this.interface.getHelpEmbed(embed);

		// apply fields
		const unsorted: Array<[string, Array<string>]> = [];
		for (const [category, commands] of this.cm.getCategorizedCommands()) {
			const names = Array.from(commands.entries())
				.filter(([, v]) => !v.definition.hidden) // remove hidden
				.map(k => k[0]).sort();

			const display = await ctx.formatTranslation(`BENTOCORD_HELP_CATEGORY_${category.toLocaleUpperCase()}`, {}, category.toLocaleUpperCase());
			unsorted.push([display, names]);
		}

		// sort alphabetically and addFields
		unsorted.sort().forEach(([display, names]) => embed.addField(display, `\`${names.join('`, `')}\``, false));

		// add help usage details
		await embed.addTranslatedField('\u200b', { key: 'BENTOCORD_HELP_USAGE',
			backup: '`help commandName` - Command Details\n`help commandName subCommandName` - Sub Command Details\n`help commandName optionName` - Option Details\n`help categoryName` - Category Details' });

		return ctx.createResponse({ embeds: [embed.toJSON()] });
	}

	private async showCategoryHelp(ctx: CommandContext, category: string, commands: Map<string, CommandDetails>): Promise<unknown> {
		const choices: Array<PromptChoice<CommandDefinition>> = [];
		for (const [command, details] of Array.from(commands.entries()).sort()) {
			// skip hidden
			if (details.definition.hidden ?? false) continue;

			let description = details.definition.description;
			if (typeof description === 'object') description = await ctx.formatTranslation(description.key, description.repl, description.backup);

			let final = command;
			if (description) final = `${final} - ${description}`;

			choices.push({ name: final, value: details.definition, match: [command] });
		}

		const choice = await ctx.choice(choices, { key: `BENTOCORD_HELP_CATEGORY_${category.toLocaleUpperCase()}_DESCRIPTION`, backup: category }, { resolveOnClose: true });
		if (choice) return this.showCommandHelp(ctx, choice, []);
	}

	public async showCommandHelp(ctx: CommandContext, definition: CommandDefinition, path: Array<string>): Promise<unknown> {
		let selected: CommandDefinition | AnyCommandOption = definition;
		let selectedPath: Array<string> = [];
		const list: Map<string, string | Translateable> = new Map();

		// Good god what is this mess. Someone please fix
		// This function is responsible for fully recursing down a command object
		// This allows us to get a flat object with key = full command path, value = description
		// TODO: use this.cm.getItemTranslations & support localized help names
		const walkCommand = (item: CommandDefinition | AnySubCommandOption, depth = 0, crumb: Array<string> = []) => {
			// append ourself to crumb
			crumb = [...crumb, this.cm.getPrimaryName(item.name)];

			// process options recursivly
			const filter = path[depth] ?? null;
			let found = !filter;
			for (const option of item.options ?? []) {
				const name = this.cm.getPrimaryName(option.name);

				// filter when requested, keep track of "selected" item
				if (filter) {
					if (filter !== name) continue;
					selected = option;
					selectedPath = [...crumb];

					found = true;
				}

				// recurse & continue if options are available
				if (!this.cm.isAnySubCommand(option)) continue;

				// skip hidden, unless it was filtered
				if (!filter && (option.hidden ?? false)) continue;

				// no subcommand/group children, so add to list
				if (!(option.options ?? []).some(o => this.cm.isAnySubCommand(o))) {
					// don't add to list if filter selected this specific item, this lets showCommandHelp know to not show subCommand dialog
					if (!filter) list.set([...crumb, name].join(' '), option.description);
				}

				// TIL: ++x = value after increment, x++ = value before increment
				if (!walkCommand(option, ++depth, crumb)) return false;
			}

			return found;
		};
		if (!walkCommand(definition)) return ctx.createTranslatedResponse('BENTOCORD_HELP_NOT_FOUND', {}, 'Failed to find any relevant help for input.');

		// selected = the command/option that was requested
		// list = a map of all valid sub commands

		const primary = this.cm.getPrimaryName(selected.name);
		const fullPath = [...selectedPath, primary];
		let description = selected.description;
		if (typeof description === 'object') description = await ctx.formatTranslation(description.key, description.repl, description.backup);

		// if there are items in list then show a choice prompt with them
		// allows users to drill down futher if they want
		if (list.size > 0) {
			// translate descriptions
			const choices: Array<PromptChoice<Array<string>>> = [];
			for (let [key, desc] of list) {
				if (typeof desc === 'object') desc = await ctx.formatTranslation(desc.key, desc.repl, desc.backup);
				choices.push({ name: `${key} - ${desc}`, value: key.split(' '), match: [key] });
			}

			const subCommandResponse = await ctx.formatTranslation(
				'BENTOCORD_HELP_COMMAND', { command: fullPath.join(' '), description },
				'**Command**: `{command}`\n**Description**: {description}');

			const subCommandHeader = await ctx.formatTranslation('BENTOCORD_HELP_HEADER_SUBCOMMANDS', {}, '**Sub Commands**:');

			const choice = await ctx.choice(choices, `${subCommandResponse}\n\n${subCommandHeader}`, { resolveOnClose: true });

			// user picked something remove first element and invoke ourself again
			if (choice) return this.showCommandHelp(ctx, definition, choice.slice(1));
			return;
		}

		// selected is now either a option, or a command/subcommand/group with no child subcommand/group

		// handle options
		if ('type' in selected && !this.cm.isAnySubCommand(selected)) return this.displayOption(ctx, selected, selectedPath);

		// handle command/subcommand/group
		return this.displayCommand(ctx, definition, selected, selectedPath);
	}

	private async displayCommand(ctx: CommandContext, definition: CommandDefinition, command: CommandDefinition | AnySubCommandOption, crumb: Array<string> = []) {
		const primary = this.cm.getPrimaryName(command.name);
		const fullPath = [...crumb, primary];

		let description = command.description;
		if (typeof description === 'object') description = await ctx.formatTranslation(description.key, description.repl, description.backup);

		const response = await ctx.formatTranslation(
			'BENTOCORD_HELP_COMMAND', { command: fullPath.join(' '), description },
			'**Command**: `{command}`\n**Description**: {description}');

		// Display Options
		const choices: Array<PromptChoice<Array<string>>> = [];
		for (const option of command.options ?? []) {
			// if this is somehow possible handle it
			if (this.cm.isAnySubCommand(option)) continue;

			const name = this.cm.getPrimaryName(option.name);
			let desc = option.description;
			if (typeof desc === 'object') desc = await ctx.formatTranslation(desc.key, desc.repl, desc.backup);
			const type = this.cm.getTypePreview(option);

			choices.push({ name: `${name}${type} - ${desc}`, value: [...fullPath, name ], match: [name] });
		}

		// TODO: Dynamically generate examples and/or pull from definition

		if (choices.length > 0) {
			const optionHeader = await ctx.formatTranslation('BENTOCORD_HELP_HEADER_OPTIONS', {}, '**Options**:');
			const choice = await ctx.choice(choices, `${response}\n\n${optionHeader}`, { resolveOnClose: true });

			// user picked something remove first element and invoke showCommandHelp again
			if (choice) return this.showCommandHelp(ctx, definition, choice.slice(1));
			return;
		}

		return ctx.createResponse(response);
	}

	private async displayOption(ctx: CommandContext, option: AnyValueCommandOption, crumb: Array<string>) {
		const primary = this.cm.getPrimaryName(option.name);
		let description = option.description;
		if (typeof description === 'object') description = await ctx.formatTranslation(description.key, description.repl, description.backup);

		const type = this.cm.getTypePreview(option);

		const optionResponse = await ctx.formatTranslation(
			'BENTOCORD_HELP_OPTION', { option: primary, description, type, required: (option.required ?? true).toString(), command: crumb.join(' ') },
			'**Option**: `{option}`\n**Description**: {description}\n**Type**: {type}\n**Required**: {required}\n**Parent Command**: `{command}`');

		// TODO: Add choices, min/max, channel_types, etc

		// TODO: Dynamically generate example values based on type

		return ctx.createResponse(optionResponse);
	}
}