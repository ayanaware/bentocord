export interface CodeblockLine { key?: CodeblockLineItem; value: CodeblockLineItem }
export type CodeblockLineItem = string | number | boolean;

export class CodeblockBuilder {
	public language: string;

	private readonly lines: Array<CodeblockLine> = [];

	public constructor(language?: string) {
		this.language = language;
	}

	public addLine(item: CodeblockLineItem, value?: CodeblockLineItem): CodeblockBuilder {
		if (value !== undefined) this.lines.push({ key: item, value });
		else this.lines.push({ value: item });

		return this;
	}

	public render(): string {
		// add top
		let render = '```';

		// add language
		if (this.language) render += `${this.language}`;

		// add newline after top and/or language
		render += '\n';

		// resolve lines
		const paddingSize = this.lines.reduce((a, line) =>
			line.key != null && line.key.toString().length > a ? line.key.toString().length : a, 0,
		);

		// add lines
		for (const line of this.lines) {
			if (line.key) render += `${line.key.toString().padStart(paddingSize)} : `;
			render += `${line.value.toString()}\n`;
		}

		// add bottom
		render += '```';

		return render;
	}
}
