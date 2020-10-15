import { Guild, Message, TextableChannel, TextChannel, User } from "eris";
import { Messenger } from '../../abstractions';
import Discord from '../Discord';

export class CommandContext<T extends TextableChannel = TextableChannel> {
	public readonly message: Message<T>;
	public readonly channel: T;
	public readonly author: User;

	public readonly messenger: Messenger;

	public readonly guild?: Guild;

	public readonly prefix: string;
	public readonly alias: string;
	public readonly args: Array<string>;

	private argIndex = 0;

	public constructor(discord: Discord, message: Message<T>, prefix: string, alias: string, args: Array<string>) {
		this.message = message;

		this.channel = message.channel;
		this.author = message.author;

		this.messenger = new Messenger(discord, this.channel.id);

		// God help us
		if ((message.channel as TextChannel).guild) this.guild = (message.channel as TextChannel).guild;

		this.prefix = prefix;
		this.alias = alias;
		this.args = args;
	}

	get isMention() {
		return /^<@!?[0-9]+>$/.test(this.prefix);
	}

	public nextArg() {
		const arg = this.args[this.argIndex];
		if (arg == null) return null;

		// increment index
		this.argIndex++;

		return arg;
	}

	public remainingArgs() {
		if (this.argIndex > this.args.length) return [];

		return this.args.slice(this.argIndex);
	}
}
