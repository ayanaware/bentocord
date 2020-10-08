import { FSComponentLoader, Plugin, PluginAPI } from '@ayanaware/bento';
import { ClientOptions } from 'eris';

import { Logger } from '@ayanaware/logger-api';
const log = Logger.get();

export class Bentocord implements Plugin {
	public name: string = 'Bentocord';
	public api?: PluginAPI;

	public tokenKey: string;
	public clientOptions: ClientOptions;

	public constructor(tokenKey = 'BOT_TOKEN', clientOptions?: ClientOptions) {
		this.tokenKey = tokenKey;
		this.clientOptions = clientOptions;
	}

	public setClientOptions(clientOptions: ClientOptions) {
		this.clientOptions = clientOptions;
	}

	public async onLoad() {
		return this.api.loadComponents(FSComponentLoader, __dirname, 'components');
	}
}