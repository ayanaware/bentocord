import { Component, ComponentAPI, Inject, PluginReference } from '@ayanaware/bento';
import { Bentocord } from '../../Bentocord';
import { Discord } from '../Discord';

import { Logger } from '@ayanaware/logger-api';
const log = Logger.get();

export class CommandManager implements Component {
	public name: string = 'CommandManager';
	public api!: ComponentAPI;
	
	public parent: PluginReference = Bentocord;

	@Inject(Discord)
	private discord: Discord;

	public async onLoad() {
		log.info('TODO');
	}
}
