import { ComponentAPI, Inject } from '@ayanaware/bento';

import { SelectMenuOptions } from 'eris';

import { BentocordInterface } from '../BentocordInterface';
import { LocalizedEmbedBuilder } from '../builders/LocalizedEmbedBuilder';
import { ComponentOperation } from '../components/ComponentOperation';
import { SelectContext } from '../components/contexts/SelectContext';
import { Select } from '../components/helpers/Select';
import { AgnosticMessageContent } from '../interfaces/AgnosticMessageContent';
import { PossiblyTranslatable } from '../interfaces/Translatable';
import { CodeblockPaginator } from '../prompt/helpers/CodeblockPaginator';
import { PaginatorItem } from '../prompt/helpers/Paginator';
import { ChoicePromptChoice } from '../prompt/prompts/ChoicePrompt';

import { AnyCommandContext } from './CommandContext';
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

	public async execute(ctx: AnyCommandContext, { input }: { input?: string }): Promise<unknown> {
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

	private async showPrimaryHelp(ctx: AnyCommandContext): Promise<unknown> {
		// grab embed
		let embed = new LocalizedEmbedBuilder(ctx);
		embed = await this.interface.getHelpEmbed(embed);

		// apply fields
		const unsorted: Array<[string, string, Array<string>]> = [];
		const categories = this.cm.getCategorizedCommands();
		for (const [category, commands] of categories) {
			const names = Array.from(commands.entries())
				.filter(([, v]) => !v.definition.hidden) // remove hidden
				.map(k => k[0]).sort();

			const backup = category.charAt(0).toUpperCase() + category.slice(1);
			const display = await ctx.formatTranslation(`HELP_CATEGORY_${category.toLocaleUpperCase()}`, {}, backup);
			unsorted.push([category, display, names]);
		}

		// sort alphabetically and addFields
		unsorted.sort().forEach(([, display, names]) => embed.addField(display, `\`${names.join('`, `')}\``, false));

		// add help usage details
		await embed.addTranslatedField('\u200b', { key: 'BENTOCORD_HELP_USAGE', backup: [
			'`help commandName` - Command Details',
			'`help commandName subCommandName` - Sub Command Details',
			'`help commandName optionName` - Option Details',
			'`help categoryName` - Category Details',
		].join('\n') });

		const sltCategory = await new Select(ctx, 'bc:help:category', async (slt: SelectContext) => {
			await slt.deferUpdate();
			await op.close();

			return this.showCategoryHelp(ctx, slt.values[0]);
		}).addOptions(unsorted.map<SelectMenuOptions>(([value, label]) => ({ value, label })))
		.placeholderTranslated('BENTOCORD_HELP_SELECT_CATEGORY', null, 'Select a Category');

		const op = new ComponentOperation(ctx)
			.content({ content: '', embeds: [embed] })
			.addRows([[sltCategory]]);

		return op.start();
	}

	private async showCategoryHelp(ctx: AnyCommandContext, category: string, commands?: Map<string, CommandDetails>): Promise<unknown> {
		if (!commands) commands = this.cm.getCategorizedCommands().get(category);

		const choices: Array<PaginatorItem<CommandDefinition>> = [];
		for (const [command, details] of Array.from(commands.entries()).sort()) {
			// skip hidden
			if (details.definition.hidden ?? false) continue;

			const description = details.definition.description;
			const label = command;

			choices.push({ label, description, value: details.definition, match: [command] });
		}

		const backup = category.charAt(0).toUpperCase() + category.slice(1);
		const embed = new LocalizedEmbedBuilder(ctx);
		await embed.setTranslatedTitle({ key: `BENTOCORD_HELP_CATEGORY_${category.toLocaleUpperCase()}_DESCRIPTION`, backup });

		const choice = await ctx.choice(new (class extends CodeblockPaginator<CommandDefinition> {
			public async render(): Promise<AgnosticMessageContent> {
				embed.setDescription((await this.build()).render());

				return { content: '', embeds: [embed] };
			}
		})(ctx, choices), null, { showCloseError: false });
		if (choice) return this.showCommandHelp(ctx, choice);
	}

	// TODO: refactor this mess to be more maintainable
	public async showCommandHelp(ctx: AnyCommandContext, definition: CommandDefinition, path: Array<string> = []): Promise<unknown> {
		let selected: CommandDefinition | AnyCommandOption = definition;
		let selectedPath: Array<string> = [];
		const list: Map<string, PossiblyTranslatable> = new Map();

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
		selected = selected as CommandDefinition | AnyCommandOption; // fix types for some reason

		let description = selected.description;
		if (typeof description === 'object') description = await ctx.formatTranslation(description.key, description.repl, description.backup);

		// if there are items in list then show a choice prompt with them
		// allows users to drill down futher if they want
		if (list.size > 0) {
			// translate descriptions
			const choices: Array<ChoicePromptChoice<Array<string>>> = Array.from(list.entries()).map(([label, desc]) => ({
				label, description: desc,
				value: label.split(' '),
				match: [label],
			}));

			const getEmbed = async () => this.buildCommandEmbed(ctx, selected as AnySubCommandOption, selectedPath);
			const choice = await ctx.choice<Array<string>>(new (class extends CodeblockPaginator<Array<string>> {
				public async render(): Promise<AgnosticMessageContent> {
					const embed = await getEmbed();
					await embed.addTranslatedField({ key: 'BENTOCORD_WORD_SUBCOMMANDS', backup: 'Sub Commands' }, (await this.build()).render());

					return { content: '', embeds: [embed] };
				}
			})(ctx, choices), null, { showCloseError: false });

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

	public async buildCommandEmbed(ctx: AnyCommandContext, command: CommandDefinition | AnySubCommandOption, crumb: Array<string>): Promise<LocalizedEmbedBuilder> {
		const primary = this.cm.getPrimaryName(command.name);
		const full = [...crumb, primary];

		const embed = await new LocalizedEmbedBuilder(ctx)
			.setTitle(full.join(' '))
			.setTranslatedDescription(command.description);

		// aliases
		const names = await this.cm.getItemTranslations(command.name);
		const aliases = names.map(n => n[0]).filter(n => n !== primary);
		if (aliases.length > 0) {
			await embed.addTranslatedField({ key: 'BENTOCORD_WORD_ALIASES', backup: 'Aliases' }, aliases.map(a => `\`${a}\``).join(', '));
		}

		// TODO: Dynamically generate examples and/or pull from definition

		return embed;
	}

	private async displayCommand(ctx: AnyCommandContext, definition: CommandDefinition, command: CommandDefinition | AnySubCommandOption, crumb: Array<string> = []) {
		const getEmbed = async () => this.buildCommandEmbed(ctx, command, crumb);
		const primary = this.cm.getPrimaryName(command.name);

		const options = command.options ?? [];
		if (options.length === 0) return ctx.createResponse({ content: '', embeds: [await getEmbed()] });

		const choices: Array<ChoicePromptChoice<string>> = [];
		for (const option of options) {
			if (this.cm.isAnySubCommand(option)) continue;

			const name = this.cm.getPrimaryName(option.name);
			const type = this.cm.getTypePreview(option);

			let description = option.description;
			if (typeof description === 'object') description = await ctx.formatTranslation(description);

			choices.push({ label: `${name}${type}`, description, value: name, match: [name] });
		}

		const choice = await ctx.choice<string>(new (class extends CodeblockPaginator<string> {
			public async render(): Promise<AgnosticMessageContent> {
				const embed = await getEmbed();
				await embed.addTranslatedField({ key: 'BENTOCORD_WORD_OPTIONS', backup: 'Options' }, (await this.build()).render());

				return { content: '', embeds: [embed] };
			}
		})(ctx, choices), null, { showCloseError: false });

		if (choice) return this.showCommandHelp(ctx, definition, [...crumb, primary, choice].slice(1));
	}

	private async displayOption(ctx: AnyCommandContext, option: AnyValueCommandOption, crumb: Array<string>) {
		const primary = this.cm.getPrimaryName(option.name);

		const getEmbed = async () => {
			const embed = await new LocalizedEmbedBuilder(ctx)
				.setTitle(primary)
				.setAuthor(crumb.join(' '))
				.setTranslatedDescription(option.description);

			const type = this.cm.getTypePreview(option);
			await embed.addTranslatedField({ key: 'BENTOCORD_WORD_TYPE', backup: 'Type' }, type, true);

			const required = option.required ?? true;
			await embed.addTranslatedField({ key: 'BENTOCORD_WORD_REQUIRED', backup: 'Required' }, required ? '✅' : '❌', true);

			// Add option help info
			const resolver = this.cm.findResolver(option.type);
			if (resolver && typeof resolver.help === 'function') {
				try {
					const help = await resolver.help(ctx, option, new Map());
					for (const [key, value] of help.entries()) embed.addField(key, value, true);
				} catch { /* no op */ }
			}

			return embed;
		};

		// handle choices
		if ('choices' in option) {
			let choices = option.choices;
			if (typeof choices === 'function') choices = await choices();

			return ctx.pagination(new (class extends CodeblockPaginator {
				public async render(): Promise<AgnosticMessageContent> {
					const embed = await getEmbed();
					await embed.addTranslatedField({ key: 'BENTOCORD_WORD_CHOICES', backup: 'Choices' }, (await this.build()).render());

					return { content: '', embeds: [embed] };
				}
			})(ctx, choices.map(c => ({ label: c.value.toString(), description: c.description }))), null, { showCloseError: false });
		}

		// TODO: Dynamically generate example values based on type
		return ctx.createResponse({ content: '', embeds: [await getEmbed()] });
	}
}
