import { CommandContext } from '../commands/CommandContext';
import { Translateable } from '../interfaces/Translateable';

import { CodeblockLineItem, CodeblockBuilder } from './CodeblockBuilder';

export type LocalizedLineItem = string | Translateable;

export class LocalizedCodeblockBuilder extends CodeblockBuilder {
	private readonly ctx: CommandContext;

	public constructor(ctx: CommandContext, language?: string) {
		super(language);

		this.ctx = ctx;
	}

	public async setTranslatedHeader(key: string, repl?: Record<string, unknown>, backup?: string): Promise<void> {
		const translated = await this.ctx.formatTranslation(key, repl, backup);
		return this.setHeader(translated);
	}

	public async setTranslatedFooter(key: string, repl?: Record<string, unknown>, backup?: string): Promise<void> {
		const translated = await this.ctx.formatTranslation(key, repl, backup);
		return this.setFooter(translated);
	}

	public async addTranslatedLine(item: LocalizedLineItem, value?: LocalizedLineItem | CodeblockLineItem): Promise<LocalizedCodeblockBuilder> {
		if (typeof item === 'string') item = { key: item };
		const itemTranslated = await this.ctx.formatTranslation(item.key, item.repl, item.backup);

		if (value !== undefined) {
			let valueTranslated: CodeblockLineItem;
			if (typeof value === 'object') valueTranslated = await this.ctx.formatTranslation(value.key, value.repl, value.backup);
			else valueTranslated = value;

			this.addLine(itemTranslated, valueTranslated);
		} else {
			this.addLine(itemTranslated);
		}

		return this;
	}
}
