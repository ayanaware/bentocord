/* eslint-disable @typescript-eslint/naming-convention */
import { ActionRow, ActionRowComponents, AdvancedMessageContent, Constants, FileContent, InteractionContent, MessageContent } from 'eris';

import type { AnyContext } from '../contexts/AnyContext';

import type { ComponentsManager } from './ComponentsManager';
import type { AnyComponentContext } from './contexts/AnyComponentContext';
import type { Button } from './helpers/Button';
import type { Select } from './helpers/Select';

const { ComponentTypes } = Constants;

export type AnyComponent = Button | Select;

export class ComponentOperation<T = unknown> {
	protected readonly ctx: AnyContext;
	protected readonly cm: ComponentsManager;

	protected _content: AdvancedMessageContent | InteractionContent;
	protected _files: Array<FileContent> = [];
	protected _rows: Array<Array<AnyComponent>> = [];

	public timeoutSeconds = 60;

	private timeout: NodeJS.Timeout;
	private messageId: string;

	protected resolve: (value?: T) => void;
	protected reject: (reason?: any) => void;

	protected resolveOnClose = true;

	public constructor(ctx: AnyContext) {
		this.ctx = ctx;
		this.cm = ctx.api.getEntity('@ayanaware/bentocord:ComponentsManager');
	}

	public content(content: MessageContent | InteractionContent): this {
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
		if (rows.length > 3) throw new Error('Must be 3 rows or less');

		this._rows = rows;
		return this;
	}

	public async render(): Promise<void> {
		const rows: Array<ActionRow> = [];
		for (const row of this._rows) {
			const components: Array<ActionRowComponents> = row.map(c => c.definition);
			if (components.length < 1) continue; // prevent empty components action rows

			rows.push({ type: ComponentTypes.ACTION_ROW, components });
		}

		const content = this._content;
		content.components = rows;

		try {
			await this.ctx.createResponse(content, this._files);
			const message = await this.ctx.getResponse();

			// update our handler if need be
			if (this.messageId !== message.id) {
				if (this.messageId) this.cm.removeMessageHandler(this.messageId);

				this.cm.addMessageHandler(message.id, this.handleInteraction.bind(this), this.close.bind(this));
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
		return this.close();
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

		// resolve start if need be
		if (this.resolve && this.resolveOnClose) this.resolve();
	}
}
