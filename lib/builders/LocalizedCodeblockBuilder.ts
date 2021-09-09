import { CommandContext } from '../commands/CommandContext';

import { CodeblockLineItem, CodeblockBuilder } from './CodeblockBuilder';

export type LocalizedLineItem = string | { key: string, repl?: Record<string, unknown> };

export class LocalizedCodeblockBuilder extends CodeblockBuilder {
	private readonly ctx: CommandContext;

	public constructor(ctx: CommandContext, language?: string) {
		super(language);

		this.ctx = ctx;
	}

	public async addTranslatedLine(key: LocalizedLineItem, value: LocalizedLineItem | CodeblockLineItem): Promise<LocalizedCodeblockBuilder> {
		if (typeof key === 'string') key = { key };
		const keyTranslated = await this.ctx.getTranslation(key.key, key.repl);

		let valueTranslated: CodeblockLineItem;
		if (typeof value === 'object') valueTranslated = await this.ctx.getTranslation(value.key, value.repl);
		else valueTranslated = value;

		this.addLine(keyTranslated, valueTranslated);

		return this;
	}
}
