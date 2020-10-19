import { ComponentAPI } from '@ayanaware/bento';
import { Guild, Member, Message, TextableChannel, TextChannel, User } from "eris";
import { Messenger } from '../../abstractions';
import { Bentocord } from '../../Bentocord';
import { BentocordVariable } from '../../constants';
import { PermissionLike, StorageLike } from '../../interfaces';
import Discord from '../Discord';

export class CommandContext<T extends TextableChannel = TextableChannel> {
	public readonly discord: Discord;
	public readonly storage: StorageLike;
	public readonly permissions: PermissionLike;

	public readonly message: Message<T>;
	public readonly channel: T;
	public readonly channelId: string;

	public readonly author: User;
	public readonly authorId: string;

	public readonly messenger: Messenger;

	public readonly guild?: Guild;
	public readonly guildId?: string;
	public readonly member?: Member;

	public readonly prefix: string;
	public readonly name: string;
	public readonly alias: string;
	public readonly args: Array<string>;

	private argIndex = 0;

	public constructor(api: ComponentAPI, message: Message<T>, prefix: string, name: string, alias: string, args: Array<string>) {
		this.discord = api.getEntity(Discord);

		this.storage = api.getEntity(api.getVariable(BentocordVariable.BENTOCORD_STORAGE_ENTITY));
		this.permissions = api.getEntity(api.getVariable(BentocordVariable.BENTOCORD_PERMISSIONS_ENTITY));

		this.message = message;

		this.channel = message.channel;
		this.channelId = this.channel.id;

		this.author = message.author;
		this.authorId = this.author.id;

		this.messenger = new Messenger(this.discord, this.channel.id);

		// God help us
		if ((message.channel as TextChannel).guild) {
			this.guild = (message.channel as TextChannel).guild;
			this.guildId = this.guild.id;
		}

		if (message.member) this.member = message.member;

		this.name = name;
		this.prefix = prefix;
		this.alias = alias;
		this.args = args;
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
