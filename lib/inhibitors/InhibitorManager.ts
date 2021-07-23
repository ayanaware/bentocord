import { Component, ComponentAPI } from '@ayanaware/bento';

import { CommandContext } from '../commands';
import { InhibitorName } from './constants';
import { Inhibitor, InhibitorDefinition, InhibitorEntity, InhibitorFn } from './interfaces';
import { isPromise } from '../util';

import inhibitors from './Inhibitors';

import { Logger } from '@ayanaware/logger-api';
const log = Logger.get();

export class InhibitorManager implements Component {
	public name = '@ayanaware/bentocord:InhibitorManager';
	public api!: ComponentAPI;

	private inhibitors: Map<InhibitorName, Inhibitor> = new Map();

	public async onLoad() {
		return this.addInhibitors(inhibitors);
	}

	public async onChildLoad(entity: InhibitorEntity) {
		try {
			if (typeof entity.inhibitor !== 'string') throw new Error(`Inhibitor Entity "${entity.name}".inhibitor must be defined`);
			if (!entity.inhibitor) throw new Error(`Inhibitor Entity "${entity.name}".inhibitor must be a valid string`);

			if (typeof entity.execute !== 'function') throw new Error(`$Inhibitor Entity "${entity.name}".execute() must be a function`);

			this.addInhibitor({ inhibitor: entity.inhibitor, execute: entity.execute, context: entity });
		} catch (e) {
			log.warn(e);
		}
	}

	public async onChildUnload(entity: InhibitorEntity) {
		try {
			if (typeof entity.inhibitor !== 'string') throw new Error(`Inhibitor Entity "${entity.name}".inhibitor must be defined`);
			if (!entity.inhibitor) throw new Error(`Inhibitor Entity "${entity.name}".inhibitor must be a valid string`);

			this.removeInhibitor(entity.inhibitor);
		} catch (e) {
			log.warn(e);
		}
	}

	public addInhibitors(inhibitors: Array<Inhibitor>) {
		for (const inhibitor of inhibitors) this.addInhibitor(inhibitor);
	}

	public addInhibitor(inhibitor: Inhibitor) {
		this.inhibitors.set(inhibitor.inhibitor, inhibitor);
	}

	public removeInhibitor(inhibitor: InhibitorName) {
		this.inhibitors.delete(inhibitor);
	}	

	public async execute(ctx: CommandContext, definition: InhibitorDefinition) {
		let args: Array<any> = [];

		const findInhibitor = (name: string) => {
			const inhibitor = this.inhibitors.get(name);
			if (!inhibitor) throw new Error(`Could not find inhibitor for name: ${inhibitor}`);

			return inhibitor;
		}

		let inhibitor: Inhibitor;
		if (typeof definition === 'object') {
			if (typeof definition.execute === 'string') {
				const found = findInhibitor(definition.execute);
				inhibitor = {inhibitor: definition.execute, execute: found.execute, args: definition.args, context: definition.context };
			} else inhibitor = { execute: definition.execute, args: definition.args, context: definition.context };
		} else if (typeof definition === 'function') inhibitor = { execute: definition };
		else if (typeof definition === 'string') inhibitor = findInhibitor(definition);

		if (!inhibitor) throw new Error(`Could not find inhibitor`); 

		let result = inhibitor.execute.call(inhibitor.context || ctx.command, ctx, ...args);
		if (isPromise(result)) result = await result;

		return { inhibitor: inhibitor.inhibitor, result };
	}
}
