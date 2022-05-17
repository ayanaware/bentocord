import { AnyCommandContext } from '../commands/CommandContext';
import { Translateable } from '../interfaces/Translateable';

import { EmbedBuilder } from './EmbedBuilder';

export class LocalizedEmbedBuilder extends EmbedBuilder {
	private readonly ctx: AnyCommandContext;

	public constructor(ctx: AnyCommandContext) {
		super();

		this.ctx = ctx;
	}

	public async setTranslatedTitle(title: string | Translateable): Promise<this> {
		if (typeof title === 'object') title = await this.ctx.formatTranslation(title.key, title.repl) || title.key;

		this.setTitle(title);

		return this;
	}

	public async setTranslatedDescription(description: string | Translateable): Promise<this> {
		if (typeof description === 'object') description = await this.ctx.formatTranslation(description.key, description.repl, description.backup);

		this.setDescription(description);

		return this;
	}

	public async setTranslatedAuthor(name: string | Translateable, url?: string, iconUrl?: string): Promise<this> {
		if (typeof name === 'object') name = await this.ctx.formatTranslation(name.key, name.repl, name.backup);

		this.setAuthor(name, url, iconUrl);

		return this;
	}

	public async addTranslatedField(name: string | Translateable, value?: string | Translateable, inline: boolean = false): Promise<this> {
		if (typeof name === 'object') name = await this.ctx.formatTranslation(name.key, name.repl, name.backup);
		if (typeof value === 'object') value = await this.ctx.formatTranslation(value.key, value.repl, value.backup);

		this.addField(name, value, inline);

		return this;
	}

	public async setTranslatedFooter(text: string | Translateable, iconUrl?: string): Promise<this> {
		if (typeof text === 'object') text = await this.ctx.formatTranslation(text.key, text.repl, text.backup);

		this.setFooter(text, iconUrl);

		return this;
	}
}
