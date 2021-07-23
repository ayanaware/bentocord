import { Guild, Member, Message, TextableChannel, TextChannel, User } from 'eris';

import { Discord, Messenger } from '../discord';
import { PermissionLike, Permissions, Storage, StorageLike } from '../plugins';
import PromptManager from '../prompt';

import { CommandEntity } from './interfaces';

export class CommandContext<T extends TextableChannel = TextableChannel> {
	public readonly command: CommandEntity;

	public readonly message: Message<T>;
	public readonly channel: T;
	public readonly channelId: string;

	public readonly author: User;
	public readonly authorId: string;

	public readonly guild?: Guild;
	public readonly guildId?: string;
	public readonly member?: Member;

	public readonly prefix: string;
	public readonly alias: string;
	public readonly raw: string;

	public readonly discord: Discord;
	public readonly promptManager: PromptManager;
	public readonly storage: StorageLike;
	public readonly permissions: PermissionLike;

	public readonly messenger: Messenger;

	public args: { [key: string]: any } = {};

	public constructor(command: CommandEntity, message: Message<T>, prefix: string, alias: string, raw: string) {
		this.command = command;
		this.message = message;

		this.prefix = prefix;
		this.alias = alias;
		this.raw = raw;

		// Channel
		this.channel = message.channel;
		this.channelId = this.channel.id;

		// Author
		this.author = message.author;
		this.authorId = this.author.id;


		// God help us (Guild, If Available)
		if ((message.channel as TextChannel).guild) {
			this.guild = (message.channel as TextChannel).guild;
			this.guildId = this.guild.id;
		}

		// Member (If Available)
		if (message.member) this.member = message.member;

		// Entities
		this.discord = this.command.api.getEntity(Discord);
		this.promptManager = this.command.api.getEntity(PromptManager);
		this.storage = this.command.api.getEntity(Storage);
		this.permissions = this.command.api.getEntity(Permissions);

		this.messenger = new Messenger(this.discord, this.channel.id);

		// this.args = this.parser.results.all.filter(i => i.type == ParsedType.PHRASE).map(i => i.value);
	}

	get isMention() {
		return /^<@!?[0-9]+>$/.test(this.prefix);
	}

	/**
	 * Check if command author is a owner
	 */
	public isOwner() {
		return this.permissions.isOwner(this.authorId);
	}

	/**
	 * Check if permission is granted
	 * @param permission Permission
	 */
	public async hasPermission(permission: string) {
		const scopes = [this.author.id];
		if (this.member) {
			// TODO: Append roleIds in order of guild for overrides. And since this is expensive Cache it
			// message.member.roles.forEach(i => scopes.push(i));
		}

		return this.permissions.hasPermission(permission, this.guildId, scopes);
	}
}
