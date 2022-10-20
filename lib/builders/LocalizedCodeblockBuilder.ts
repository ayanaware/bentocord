import type { BaseContext } from '../contexts/BaseContext';
import { PossiblyTranslatable } from '../interfaces/Translatable';

import { CodeblockLineItem, CodeblockBuilder } from './CodeblockBuilder';

export class LocalizedCodeblockBuilder extends CodeblockBuilder {
	private readonly ctx: BaseContext;

	public constructor(ctx: BaseContext, language?: string) {
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

	public async addTranslatedLine(item: PossiblyTranslatable, value?: PossiblyTranslatable | CodeblockLineItem): Promise<LocalizedCodeblockBuilder> {
		if (typeof item === 'object') item = await this.ctx.formatTranslation(item);

		if (value !== undefined) {
			if (typeof value === 'object') value = await this.ctx.formatTranslation(value);
			this.addLine(item, value);
		} else {
			this.addLine(item);
		}

		return this;
	}
}
