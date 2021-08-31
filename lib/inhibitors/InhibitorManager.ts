import { Component, ComponentAPI } from '@ayanaware/bento';
import { Logger } from '@ayanaware/logger-api';

import { CommandContext } from '../commands/CommandContext';

import Inhibitors from './Inhibitors';
import { InhibitorName } from './constants/InhibitorType';
import { Inhibitor, InhibitorDefinition } from './interfaces/Inhibitor';
import type { InhibitorEntity } from './interfaces/InhibitorEntity';

const log = Logger.get();
export class InhibitorManager implements Component {
	public name = '@ayanaware/bentocord:InhibitorManager';
	public api!: ComponentAPI;

	private readonly inhibitors: Map<InhibitorName, Inhibitor> = new Map();

	// eslint-disable-next-line @typescript-eslint/require-await
	public async onLoad(): Promise<void> {
		return this.addInhibitors(Inhibitors);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async onChildLoad(entity: InhibitorEntity): Promise<void> {
		try {
			if (typeof entity.inhibitor !== 'string') throw new Error(`Inhibitor Entity "${entity.name}".inhibitor must be defined`);
			if (!entity.inhibitor) throw new Error(`Inhibitor Entity "${entity.name}".inhibitor must be a valid string`);

			if (typeof entity.execute !== 'function') throw new Error(`$Inhibitor Entity "${entity.name}".execute() must be a function`);

			this.addInhibitor({ inhibitor: entity.inhibitor, execute: entity.execute, context: entity });
		} catch (e) {
			log.warn(e);
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async onChildUnload(entity: InhibitorEntity): Promise<void> {
		try {
			if (typeof entity.inhibitor !== 'string') throw new Error(`Inhibitor Entity "${entity.name}".inhibitor must be defined`);
			if (!entity.inhibitor) throw new Error(`Inhibitor Entity "${entity.name}".inhibitor must be a valid string`);

			this.removeInhibitor(entity.inhibitor);
		} catch (e) {
			log.warn(e);
		}
	}

	public addInhibitors(inhibitors: Array<Inhibitor>): void {
		for (const inhibitor of inhibitors) this.addInhibitor(inhibitor);
	}

	public addInhibitor(inhibitor: Inhibitor): void {
		this.inhibitors.set(inhibitor.inhibitor, inhibitor);
	}

	public removeInhibitor(inhibitor: InhibitorName): void {
		this.inhibitors.delete(inhibitor);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async execute(ctx: CommandContext, definition: InhibitorDefinition) {
		const args: Array<any> = [];

		const findInhibitor = (name: string) => {
			const inhib = this.inhibitors.get(name);
			if (!inhib) throw new Error(`Could not find inhibitor for name: ${inhib}`);

			return inhib;
		};

		let inhibitor: Inhibitor;
		if (typeof definition === 'object') {
			if (typeof definition.execute === 'string') {
				const found = findInhibitor(definition.execute);
				inhibitor = { inhibitor: definition.execute, execute: found.execute, args: definition.args, context: definition.context };
			} else {
				inhibitor = { execute: definition.execute, args: definition.args, context: definition.context };
			}
		} else if (typeof definition === 'function') {
			inhibitor = { execute: definition };
		} else if (typeof definition === 'string') {
			inhibitor = findInhibitor(definition);
		}

		if (!inhibitor) throw new Error('Could not find inhibitor');

		const result = await inhibitor.execute.call(inhibitor.context || ctx.command, ctx, ...args);
		return { inhibitor: inhibitor.inhibitor, result };
	}
}
