import { Component, ComponentAPI } from '@ayanaware/bento';
import { CommandContext } from '../commands';
import { InhibitorName } from './constants';
import { Inhibitor, InhibitorDefinition, InhibitorFn } from './interfaces';
import { isPromise } from '../util';

import inhibitos from './Inhibitors';

export class InhibitorManager implements Component {
	public name = 'InhibitorManager';
	public api!: ComponentAPI;

	private inhibitors: Map<InhibitorName, InhibitorFn> = new Map();

	public async onLoad() {
		return this.addInhibitors(inhibitos);
	}

	public addInhibitors(inhibitors: Array<Inhibitor>) {
		for (const inhibitor of inhibitors) this.addInhibitor(inhibitor.type, inhibitor.fn);
	}

	public addInhibitor(name: InhibitorName, fn: InhibitorFn) {
		this.inhibitors.set(name, fn);
	}

	public removeInhibitor(name: InhibitorName) {
		this.inhibitors.delete(name);
	}	

	public async execute(ctx: CommandContext, inhibitor: InhibitorDefinition) {
		let fn: InhibitorFn;
		let args: Array<any> = [];

		const findFn = (name: string) => {
			const fn = this.inhibitors.get(name);
			if (!fn) throw new Error(`Could not find inhibitor for name: ${inhibitor}`);

			return fn;
		}

		if (typeof inhibitor === 'function') fn = inhibitor;
		else if (typeof inhibitor === 'string') fn = findFn(inhibitor);
		else if (typeof inhibitor === 'object') {
			if (typeof inhibitor.fn === 'function') fn = inhibitor.fn;
			else fn = findFn(inhibitor.fn);

			if (Array.isArray(inhibitor.args)) args = inhibitor.args;
		} 
		

		if (!fn) throw new Error(`Could not find inhibitor function`); 

		let result = fn.call(ctx.command, ctx, ...args);
		if (isPromise(result)) result = await result;

		return result;
	}
}
