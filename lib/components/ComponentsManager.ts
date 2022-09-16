import * as util from 'util';

import { Component, ComponentAPI, Subscribe } from '@ayanaware/bento';
import { Logger } from '@ayanaware/logger-api';

import { AnyInteraction, ComponentInteraction, Constants } from 'eris';

import { Discord } from '../discord/Discord';
import { DiscordEvent } from '../discord/constants/DiscordEvent';

import { AnyComponentContext } from './contexts/AnyComponentContext';
import { ButtonContext } from './contexts/ButtonContext';
import { SelectContext } from './contexts/SelectContext';
import type { ComponentHandler } from './interfaces/ComponentHandler';
import type { ParsedCustomId } from './util/ParseCustomId';

const { ComponentTypes } = Constants;

export type CloseHandler = () => Promise<void>;

export enum ComponentManagerEvent {
	/**
	 * Fired when a component handler was successfully executed
	 * @param ctx AnyComponentContext
	 * @param mili Miliseconds
	 */
	COMPONENT_SUCCESS = 'componentSuccess',

	/**
	 * Fired when a component handler throws an error
	 * @param error Error
	 * @param ctx AnyComponentContext
	 * @param mili Miliseconds
	 */
	COMPONENT_FAILURE = 'componentFailure',
}

const log = Logger.get();
export class ComponentsManager implements Component {
	public name = '@ayanaware/bentocord:ComponentsManager';
	public api!: ComponentAPI;

	private readonly prefixHandlers: Map<string, [ComponentHandler, CloseHandler]> = new Map();
	private readonly messageHandlers: Map<string, [ComponentHandler, CloseHandler]> = new Map();

	public async onUnload(): Promise<void> {
		// close open handlers
		for (const [id, [, close]] of [...this.messageHandlers, ...this.prefixHandlers]) {
			if (!close) continue;

			try {
				await close();
			} catch { /* NO-OP */ }

			this.messageHandlers.delete(id);
			this.prefixHandlers.delete(id);
		}
	}

	public hasPrefixHandler(prefix: string): boolean {
		return this.prefixHandlers.has(prefix);
	}

	public addPrefixHandler(prefix: string, handler: ComponentHandler, close?: CloseHandler): void {
		if (this.hasPrefixHandler(prefix)) throw new Error(`Prefix handler already exists for "${prefix}"`);
		if (!close) close = async () => { /* NO-OP */ };

		this.prefixHandlers.set(prefix, [handler, close]);
	}

	public removePrefixHandler(prefix: string): void {
		this.prefixHandlers.delete(prefix);
	}

	public hasMessageHandler(messageId: string): boolean {
		return this.messageHandlers.has(messageId);
	}

	public addMessageHandler(messageId: string, handler: ComponentHandler, close?: CloseHandler): void {
		if (this.hasMessageHandler(messageId)) throw new Error('MessageId has already been assigned a handler');
		if (!close) close = async () => { /* NO-OP */ };

		this.messageHandlers.set(messageId, [handler, close]);
	}

	public removeMessageHandler(messageId: string): void {
		this.messageHandlers.delete(messageId);
	}

	public async findHandler(ctx: AnyComponentContext, customId: ParsedCustomId): Promise<ComponentHandler> {
		// check message handlers
		const [messageHandler] = this.messageHandlers.get(ctx.messageId) ?? [];
		if (messageHandler) return messageHandler;

		// attempt to find a prefix handler
		if (!customId.prefix) return null;

		for (const [prefix, handler] of this.prefixHandlers.entries()) {
			if (prefix !== customId.prefix) continue;

			return handler[0];
		}
	}

	@Subscribe(Discord, DiscordEvent.INTERACTION_CREATE)
	private async handleInteraction(interaction: AnyInteraction) {
		// Only handle Components
		if (!(interaction instanceof ComponentInteraction)) return;

		let ctx: ButtonContext | SelectContext;
		if (interaction.data.component_type === ComponentTypes.BUTTON) ctx = new ButtonContext(this.api, interaction);
		else if (interaction.data.component_type === ComponentTypes.SELECT_MENU) ctx = new SelectContext(this.api, interaction);

		await ctx.prepare();

		const parsed = ctx.parseCustomId();
		const handler = await this.findHandler(ctx, parsed);
		if (!handler) return;

		const start = process.hrtime();
		try {
			await handler(ctx);

			const end = process.hrtime(start);
			const nano = end[0] * 1e9 + end[1];
			const mili = nano / 1e6;

			this.api.emit(ComponentManagerEvent.COMPONENT_SUCCESS, ctx, mili);
			log.debug(`Component "${ctx.customId}" executed by "${ctx.userId}", took ${mili}ms`);
		} catch (e) {
			const end = process.hrtime(start);
			const nano = end[0] * 1e9 + end[1];
			const mili = nano / 1e6;

			this.api.emit(ComponentManagerEvent.COMPONENT_FAILURE, e, ctx, mili);
			log.error(`Component handler error:\n${util.inspect(e)}`);
		}
	}
}
