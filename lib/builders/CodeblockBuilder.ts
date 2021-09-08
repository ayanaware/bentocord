export interface CodeblockLine { key?: CodeblockLineItem; value: CodeblockLineItem }
export type CodeblockLineItem = number | string | boolean | CodeblockLineObject;
export interface CodeblockLineObject {[key: string]: number | string | boolean}

export type CodeblockLanguage = 'apache' | 'prolog' | 'css' | string;

export class CodeblockBuilder {
	public language: CodeblockLanguage = null;
	private readonly lines: Array<CodeblockLine> = [];

	// eslint-disable-next-line @typescript-eslint/require-await
	public async resolveLine(item: CodeblockLineItem): Promise<string> {
		return JSON.stringify(item);
	}

	public addLine(item: CodeblockLineItem, value?: CodeblockLineItem): CodeblockBuilder {
		if (value !== undefined) this.lines.push({ key: item, value });
		else this.lines.push({ value: item });

		return this;
	}

	public async render(): Promise<string> {
		// add top
		let render = '```';

		// add language
		if (this.language) render += `${this.language}`;

		// add newline after top and/or language
		render += '\n';

		// resolve lines
		const lines: Array<{ key?: string, value: string }> = [];
		for (const line of this.lines) {
			if (line.key != null && typeof line.key === 'object') line.key = await this.resolveLine(line.key);
			if (line.value != null && typeof line.value === 'object') line.value = await this.resolveLine(line.value);

			lines.push(line as { key?: string, value: string });
		}
		const paddingSize = this.lines.reduce((a, line) =>
			line.key != null && line.key.toString().length > a ? line.key.toString().length : a, 0,
		);

		// add lines
		for (const line of lines) {
			if (line.key) render += `${line.key.toString().padStart(paddingSize)} : `;
			render += `${line.value.toString()}\n`;
		}

		// add bottom
		render += '```';

		return render;
	}
}
