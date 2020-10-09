import { Component, ComponentAPI } from "@ayanaware/bento";
import { CommandContext } from "./CommandContext";

export interface Command extends Component {
	aliases: Array<string>;
	execute(ctx?: CommandContext): Promise<void>;
}

export interface CommandAPI extends ComponentAPI {}