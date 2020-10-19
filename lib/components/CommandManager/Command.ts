import { Component, Entity } from "@ayanaware/bento";
import { CommandContext } from "./CommandContext";

export interface Command extends Component {
	parent: Entity;
	aliases: Array<string>;
	execute(ctx?: CommandContext): Promise<any>;
}
