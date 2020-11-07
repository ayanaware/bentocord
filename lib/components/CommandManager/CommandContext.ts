import { Guild, Member, Message, TextableChannel, TextChannel, User } from "eris";

import { Bentocord } from '../../Bentocord';
import { Discord, Messenger } from '../Discord';
import { PermissionLike, StorageLike } from '../../interfaces';

import { ArgumentParser, ParsedArgumentType } from './ArgumentParser';

import { Command } from './interfaces';

export class CommandContext<T extends TextableChannel = TextableChannel> {
	public readonly command: Command;

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

	public discord: Discord;
	public storage: StorageLike;
	public permissions: PermissionLike;

	public messenger: Messenger;
	public parser: ArgumentParser;

	public args: Array<string>;
	private argIndex = 0;

	public constructor(command: Command, message: Message<T>, prefix: string, alias: string, raw: string) {
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
		const bentocord = this.command.api.getEntity<Bentocord>(Bentocord);
		this.storage = bentocord.storage;
		this.permissions = bentocord.permissions;

		this.messenger = new Messenger(this.discord, this.channel.id);
		this.parser = new ArgumentParser(this.raw);
		this.parser.parse();

		// backwards compatiable
		this.args = this.parser.results.all.filter(i => i.type == ParsedArgumentType.PHRASE).map(i => i.value);
	}

	public prepare() {

	}

	public async collectArguments() {

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
