import { CommandContext } from '../commands/CommandContext';

import { CodeblockLineItem, CodeblockBuilder } from './CodeblockBuilder';

export type LocalizedLineItem = string | { key: string, repl?: Record<string, unknown> };

export class LocalizedCodeblockBuilder extends CodeblockBuilder {
	private readonly ctx: CommandContext;

	public constructor(ctx: CommandContext, language?: string) {
		super(language);

		this.ctx = ctx;
	}

	public async addTranslatedLine(item: LocalizedLineItem, value?: LocalizedLineItem | CodeblockLineItem): Promise<LocalizedCodeblockBuilder> {
		if (typeof item === 'string') item = { key: item };
		const itemTranslated = await this.ctx.formatTranslation(item.key, item.repl);

		if (value !== undefined) {
			let valueTranslated: CodeblockLineItem;
			if (typeof value === 'object') valueTranslated = await this.ctx.formatTranslation(value.key, value.repl);
			else valueTranslated = value;

			this.addLine(itemTranslated, valueTranslated);
		} else {
			this.addLine(itemTranslated);
		}

		return this;
	}
}
