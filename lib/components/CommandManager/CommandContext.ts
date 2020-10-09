import { Message, TextableChannel, User } from "eris";

export class CommandContext {
	public readonly message: Message;
	public readonly channel: TextableChannel;
	public readonly author: User;

	public readonly prefix: string;
	public readonly alias: string;
	public readonly args: Array<string>;

	public constructor(message: Message, prefix: string, alias: string, args: Array<string>) {
		this.message = message;

		this.channel = message.channel;
		this.author = message.author;

		this.prefix = prefix;
		this.alias = alias;
		this.args = args;
	}

	get isMention() {
		return /^<@!?[0-9]+>$/.test(this.prefix);
	}
}
