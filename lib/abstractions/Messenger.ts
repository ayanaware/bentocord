import { Message, MessageContent, MessageFile } from 'eris';
import { Discord } from '../components';

export interface MessageOptions {
	zws?: boolean;
}

export class Messenger {
	private readonly discord: Discord;
	private readonly channelId: string;

	public constructor(discord: Discord, channelId: string) {
		this.discord = discord;
		this.channelId = channelId;
	}

	private prepareMessage(content: MessageContent, file?: MessageFile, options?: MessageOptions) {
		if (typeof content === 'string') content = { content };
		if (typeof options === 'undefined') options = {};

		if (typeof file === 'undefined') file = null;

		// handle zws
		if (options.zws) content.content = `\u200b${content.content}`;

		// handle message that become to long
		if (content.content.length > 2000) {
			file = { file: Buffer.from(content.content, 'utf8'), name: 'message.txt' };
			content.content = 'The message length was too long to be sent inline. Here is a file with the contents:';
		}

		return { content, file };
	}

	public async createMessage(content: MessageContent, file?: MessageFile, options?: MessageOptions): Promise<Message> {
		const prepare = this.prepareMessage(content, file, options);

		return this.discord.client.createMessage(this.channelId, prepare.content, prepare.file);
	}

	public async updateMessage(message: string | Message, content: MessageContent, options?: MessageOptions) {
		if (typeof message === 'object') message = message.id;
		const prepare = this.prepareMessage(content, null, options);

		return this.discord.client.editMessage(this.channelId, message, prepare.content);
	}

	// alias
	public async sendMessage(content: MessageContent, file?: MessageFile, options?: MessageOptions): Promise<Message> {
		return this.sendMessage(content, file, options);
	}
}