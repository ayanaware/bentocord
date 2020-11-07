import { Component, Entity } from "@ayanaware/bento";

import { CommandContext } from "../CommandContext";

import { CommandDefinition } from './CommandDefinition';

export interface Command extends Component {
	parent: Entity;
	definition: CommandDefinition;
	execute(ctx?: CommandContext): Promise<any>;

	/**
	 * @deprecated
	 */
	aliases?: Array<string>;
}
