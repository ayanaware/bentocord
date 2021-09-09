import { CommandContext } from '../commands/CommandContext';

import { CodeblockBuilder, CodeblockLineItem } from './CodeblockBuilder';

export class LocalizedCodeblockBuilder extends CodeblockBuilder {
	private readonly ctx: CommandContext;

	public constructor(ctx: CommandContext, language?: string) {
		super(language);

		this.ctx = ctx;
	}

	public async addTranslatedLine(key: string, value: CodeblockLineItem, repl?: Record<string, unknown>): Promise<LocalizedCodeblockBuilder> {
		const translated = await this.ctx.getTranslation(key, repl);
		this.addLine(translated, value);

		return this;
	}
}
