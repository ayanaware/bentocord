import { AnyCommandContext } from '../commands/CommandContext';
import { PossiblyTranslatable } from '../interfaces/Translatable';

import { EmbedBuilder } from './EmbedBuilder';

export class LocalizedEmbedBuilder extends EmbedBuilder {
	private readonly ctx: AnyCommandContext;

	public constructor(ctx: AnyCommandContext) {
		super();

		this.ctx = ctx;
	}

	public async setTranslatedTitle(title: PossiblyTranslatable): Promise<this> {
		if (typeof title === 'object') title = await this.ctx.formatTranslation(title) || title.key;

		this.setTitle(title);

		return this;
	}

	public async setTranslatedDescription(description: PossiblyTranslatable): Promise<this> {
		if (typeof description === 'object') description = await this.ctx.formatTranslation(description);

		this.setDescription(description);

		return this;
	}

	public async setTranslatedAuthor(name: PossiblyTranslatable, url?: string, iconUrl?: string): Promise<this> {
		if (typeof name === 'object') name = await this.ctx.formatTranslation(name);

		this.setAuthor(name, url, iconUrl);

		return this;
	}

	public async addTranslatedField(name: PossiblyTranslatable, value?: PossiblyTranslatable, inline: boolean = false): Promise<this> {
		if (typeof name === 'object') name = await this.ctx.formatTranslation(name);
		if (typeof value === 'object') value = await this.ctx.formatTranslation(value);

		this.addField(name, value, inline);

		return this;
	}

	public async setTranslatedFooter(text: PossiblyTranslatable, iconUrl?: string): Promise<this> {
		if (typeof text === 'object') text = await this.ctx.formatTranslation(text);

		this.setFooter(text, iconUrl);

		return this;
	}
}
