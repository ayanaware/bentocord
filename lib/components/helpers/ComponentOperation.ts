/* eslint-disable @typescript-eslint/naming-convention */
import { ActionRow, AdvancedMessageContent, Constants, FileContent, InteractionContent, MessageContent } from 'eris';

import { AnyContext } from '../../contexts/AnyContext';
import { ComponentsManager } from '../ComponentsManager';
import { AnyComponentContext } from '../contexts/AnyComponentContext';

import { Button } from './Button';
import { Select } from './Select';

const { ComponentTypes } = Constants;

export type AnyComponent = Button | Select;

export class ComponentOperation {
	private readonly ctx: AnyContext;
	private readonly cm: ComponentsManager;

	public timeoutSeconds = 60;

	private _content: AdvancedMessageContent | InteractionContent;
	private _files: Array<FileContent> = [];
	private _rows: Array<Array<AnyComponent>> = [];

	private timeout: NodeJS.Timeout;
	private messageId: string;

	private callback: () => void;

	public constructor(ctx: AnyContext) {
		this.ctx = ctx;
		this.cm = ctx.api.getEntity(ComponentsManager);
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

	private refreshTimeout() {
		if (this.timeout) clearTimeout(this.timeout);

		this.timeout = setTimeout(() => {
			this.close().catch(() => { /* NO-OP */ });
		}, this.timeoutSeconds * 1000);
	}

	public async render(): Promise<void> {
		const rows: Array<ActionRow> = this._rows.map(components => ({
			type: ComponentTypes.ACTION_ROW,
			components: components.map(c => c.definition),
		}));

		const content = this._content;
		content.components = rows;

		await this.ctx.createResponse(content, this._files);
		const message = await this.ctx.getResponse();

		// update our handler if need be
		if (this.messageId !== message.id) {
			if (this.messageId) this.cm.removeMessageHandler(this.messageId);

			this.cm.addMessageHandler(message.id, this.handler.bind(this), this.close.bind(this));
			this.messageId = message.id;
		}

		// refresh timeout
		this.refreshTimeout();
	}

	private async handler(ctx: AnyComponentContext) {
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

	/**
	 * Promise won't resolve until the ComponentMessage is closed
	 * Can be used to block further execution
	 */
	public async start(): Promise<void> {
		await this.render();

		return new Promise(resolve => {
			this.callback = resolve;
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
		if (this.callback) this.callback();
	}
}
