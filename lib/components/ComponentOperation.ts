/* eslint-disable @typescript-eslint/naming-convention */
import { ActionRow, ActionRowComponents, Constants, FileContent } from 'eris';

import type { AnyContext } from '../contexts/AnyContext';
import type { AgnosticMessageContent } from '../interfaces/AgnosticMessageContent';

import type { ComponentsManager } from './ComponentsManager';
import type { AnyComponentContext } from './contexts/AnyComponentContext';
import type { Button } from './helpers/Button';
import type { Select } from './helpers/Select';

const { ComponentTypes } = Constants;

export type AnyComponent = Button | Select;

export type ContentTransformer = (content?: AgnosticMessageContent) => Promise<AgnosticMessageContent>;
export class ComponentOperation<T = void> {
	protected readonly ctx: AnyContext;
	protected readonly cm: ComponentsManager;

	protected _content: AgnosticMessageContent;
	protected _merge: AgnosticMessageContent;
	public transformer: ContentTransformer;

	protected _files: Array<FileContent> = [];
	protected _rows: Array<Array<AnyComponent>> = [];
	public readonly maxRowCount = 5;

	public timeoutSeconds = 60;

	private timeout: NodeJS.Timeout;
	private messageId: string;

	protected resolve: (value?: T) => void;
	protected reject: (reason?: any) => void;

	public constructor(ctx: AnyContext) {
		this.ctx = ctx;
		// using entity name to prevent circular depends
		this.cm = ctx.api.getEntity('@ayanaware/bentocord:ComponentsManager');
	}

	public content(content: string | AgnosticMessageContent): this {
		if (typeof content === 'string') content = { content };

		this._content = content;
		return this;
	}

	public async contentTranslated(key: string, repl?: Record<string, unknown>, backup?: string): Promise<this> {
		const content = await this.ctx.formatTranslation(key, repl, backup);
		return this.content(content);
	}

	public files(files: Array<FileContent>): this {
		this._files = files;
		return this;
	}

	public rows(...rows: Array<Array<AnyComponent>>): this {
		if (rows.length > 5) throw new Error('setRows: Must be 5 rows or less');

		this._rows = rows;
		return this;
	}

	public clearRows(): this {
		this._rows = [];
		return this;
	}

	public addRows(...rows: Array<Array<AnyComponent>>): this {
		return this.rows(...[...this._rows, ...rows]);
	}

	public async render(): Promise<void> {
		const rows: Array<ActionRow> = [];
		for (const row of this._rows) {
			const components: Array<ActionRowComponents> = row.map(c => c.definition);
			if (components.length < 1) continue; // prevent empty components action rows

			rows.push({ type: ComponentTypes.ACTION_ROW, components });
		}

		// TODO: Think of a better way to solve this
		// smash objects together
		let content = Object.assign({}, this._content ?? {}, this._merge ?? {});
		content.components = rows;

		// join content & embeds as needed
		if (this._content && this._merge) {
			// merge content
			if (this._content.content && this._merge.content) content.content = `${this._content.content}\n${this._merge.content}`;

			// merge embeds
			if (this._content.embeds && this._merge.embeds) content.embeds = [...this._content.embeds ?? [], ...this._merge.embeds ?? []];
		}

		// run transformer
		if (typeof this.transformer === 'function') content = await this.transformer(content);

		try {
			await this.ctx.createResponse(content, this._files);
			const message = await this.ctx.getResponse();

			// update our handler if need be
			if (this.messageId !== message.id) {
				if (this.messageId) this.cm.removeMessageHandler(this.messageId);

				this.cm.addMessageHandler(message.id, this.handleInteraction.bind(this), this.cleanup.bind(this));
				this.messageId = message.id;
			}
		} catch { /* NO-OP */ }

		// refresh timeout
		this.refreshTimeout();
	}

	protected async handleInteraction(ctx: AnyComponentContext): Promise<void> {
		let found: AnyComponent;
		for (const row of this._rows) {
			for (const component of row) {
				if (!('custom_id' in component.definition)) continue;
				if (component.definition.custom_id !== ctx.customId) continue;

				found = component;
				break;
			}

			if (found) break;
		}

		// No component found
		if (!found) return;

		if (!found.handler) return;

		// refresh timeout
		this.refreshTimeout();

		try {
			await found.handler(ctx);
		} catch { /* NO-OP */ }
	}

	protected refreshTimeout(): void {
		if (this.timeout) clearTimeout(this.timeout);

		this.timeout = setTimeout(() => {
			this.handleTimeout().catch(() => { /* NO-OP */ });
		}, this.timeoutSeconds * 1000);
	}

	protected async handleTimeout(): Promise<void> {
		return this.cleanup();
	}

	/**
	 * Promise won't resolve until the ComponentMessage is closed
	 * Can be used to block further execution
	 */
	public async start(): Promise<T> {
		await this.render();

		return new Promise((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		});
	}

	public async close(): Promise<void> {
		await this.cleanup();

		this.resolve();
	}

	public async cleanup(): Promise<void> {
		// disable all components
		this._rows.forEach(components => {
			components.forEach(c => {
				c.disable();
			});
		});

		// preform final render
		try {
			await this.render();
		} catch { /* NO-OP */ }

		// detach handler
		if (this.messageId) this.cm.removeMessageHandler(this.messageId);

		// clearTimeout
		clearTimeout(this.timeout);
	}
}
