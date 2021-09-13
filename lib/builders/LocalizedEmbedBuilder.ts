import { CommandContext } from '../commands/CommandContext';

import { EmbedBuilder } from './EmbedBuilder';

export interface EmbedTranslateable {
	key: string;
	repl?: Record<string, unknown>;
}

export class LocalizedEmbedBuilder extends EmbedBuilder {
	private readonly ctx: CommandContext;

	public constructor(ctx: CommandContext) {
		super();

		this.ctx = ctx;
	}

	public async setTranslatedTitle(title: string | EmbedTranslateable): Promise<LocalizedEmbedBuilder> {
		if (typeof title === 'object') title = await this.ctx.getTranslation(title.key, title.repl) || title.key;

		this.setTitle(title);

		return this;
	}

	public async setTranslatedDescription(description: string | EmbedTranslateable): Promise<LocalizedEmbedBuilder> {
		if (typeof description === 'object') description = await this.ctx.getTranslation(description.key, description.repl) || description.key;

		this.setDescription(description);

		return this;
	}

	public async setTranslatedAuthor(name: string | EmbedTranslateable, url?: string, iconUrl?: string): Promise<LocalizedEmbedBuilder> {
		if (typeof name === 'object') name = await this.ctx.getTranslation(name.key, name.repl) || name.key;

		this.setAuthor(name, url, iconUrl);

		return this;
	}

	public async addTranslatedField(name: string | EmbedTranslateable, value?: string | EmbedTranslateable, inline: boolean = false): Promise<LocalizedEmbedBuilder> {
		if (typeof name === 'object') name = await this.ctx.getTranslation(name.key, name.repl) || name.key;
		if (typeof value === 'object') value = await this.ctx.getTranslation(value.key, value.repl) || value.key;

		this.addField(name, value, inline);

		return this;
	}

	public async setTranslatedFooter(text: string | EmbedTranslateable, iconUrl?: string): Promise<LocalizedEmbedBuilder> {
		if (typeof text === 'object') text = await this.ctx.getTranslation(text.key, text.repl) || text.key;

		this.setFooter(text, iconUrl);

		return this;
	}
}
