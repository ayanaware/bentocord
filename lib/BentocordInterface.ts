/* eslint-disable @typescript-eslint/no-unused-vars */
import { Plugin, PluginAPI, Variable } from '@ayanaware/bento';

import { Message } from 'eris';

import { BentocordVariable } from './BentocordVariable';
import type { LocalizedEmbedBuilder } from './builders/LocalizedEmbedBuilder';
import { MessageContext } from './interfaces/MessageContext';
import { PermissionScope, PermissionScopeType } from './interfaces/PermissionScope';

export interface ShardData {
	/** shardIds, currently MUST be sorted & consecutive. 0, 1, 2. NOT 0, 2, 42 */
	shardIds: Array<number>;

	/** shard count */
	shardCount: number;
}

// TODO: Add documentation
export class BentocordInterface implements Plugin {
	public name = '@ayanaware/bentocord:Interface';
	public api!: PluginAPI;

	public replaceable = true;

	@Variable({ name: BentocordVariable.BENTOCORD_BOT_OWNERS, default: '' })
	protected readonly owners: string;

	protected readonly prefixes: Map<string, string> = new Map();
	protected readonly permissions: Map<string, boolean> = new Map();

	public async getShardData(): Promise<ShardData> {
		return { shardIds: [0], shardCount: 1 };
	}

	/**
	 * Check if userId is a bot owner.
	 * @param userId Discord User ID
	 * @returns boolean
	 */
	public async isOwner(userId: string): Promise<boolean> {
		const owners = this.owners.split(',').map(o => o.trim());
		return owners.includes(userId);
	}

	/**
	 * Get the prefix for a given snowflake (ex: guildId).
	 * @param snowflake The snowflake
	 * @returns The prefix
	 */
	public async getPrefix(snowflake: string): Promise<string> {
		return this.prefixes.get(snowflake);
	}

	/**
	 * Set the prefix for a given snowflake.
	 * @param snowflake The snowflake
	 * @param prefix The prefix
	 */
	public async setPrefix(snowflake: string, prefix: string): Promise<void> {
		if (prefix == null) {
			this.prefixes.delete(snowflake);

			return;
		}

		this.prefixes.set(snowflake, prefix);
	}

	/** Extra ALWAYS available prefixes */
	public async getExtraPrefixes(): Promise<Array<string>> {
		return [];
	}

	public async getTestCommandPrefix(): Promise<string> {
		return 'test-';
	}

	public async getHelpEmbed(embed: LocalizedEmbedBuilder): Promise<LocalizedEmbedBuilder> {
		const name = this.api.getProperty<string>('APPLICATION_NAME') || 'Bentocord';
		const version = this.api.getProperty('APPLICATION_VERSION') || '';

		embed.setAuthor(`${name} ${version}`);

		return embed;
	}

	public async formatNumber(num: number, ctx?: Record<string, string>): Promise<string> {
		return null;
	}

	public async formatDate(date: Date, ctx?: Record<string, string>): Promise<string> {
		return null;
	}

	/**
	 * Format a translation string
	 * @param key Translation key
	 * @param repl Translation Replacements
	 * @param ctx Translation Context (Snowflakes)
	 * @param backup Translation Backup
	 * @returns Translated string
	 */
	public async formatTranslation(key: string, repl?: Record<string, unknown>, ctx?: Record<string, string>, backup?: string): Promise<string> {
		// support basic interpolation for backup strings, simplifying a lot of logic in bentocord
		if (!backup) return null;

		for (const [k, v] of Object.entries(repl ?? {})) backup = backup.replace(new RegExp(`{${k}}`, 'gi'), v.toString());
		return backup;
	}

	/**
	 * Format a translation in all available languages.
	 * @param key Translation Key
	 * @param repl Translation Replacements
	 * @returns Object, key is language, value is translation
	 */
	public async formatTranslationMap(key: string, repl?: Record<string, unknown>): Promise<Record<string, string>> {
		return {};
	}

	/**
	 * Can be used to convert translations to only the subset that discord supports
	 * @param translations Translation Map from formatTranslationMap
	 * @returns Converted Translation Map
	 */
	public async convertTranslationMap(translations: Record<string, string>): Promise<Record<string, string>> {
		return translations;
	}

	/**
	 * Get the permission for a given snowflake.
	 * @param permission The permission to check.
	 * @param snowflake The snowflake to check (usually guildId or userId)
	 * @param scope The scope to check.
	 * @returns Whether the permission is allowed.
	 */
	public async getPermission(permission: string, snowflake?: string, scope?: PermissionScope): Promise<boolean> {
		let key = `${permission}`;
		if (scope) key = `${scope.scope}.${key}`;
		if (snowflake) key = `${snowflake}.${key}`;

		return this.permissions.get(key) || null;
	}

	/**
	 * Set the permission for a given snowflake.
	 * @param permission The permission to set.
	 * @param value Whether the permission is allowed.
	 * @param snowflake The snowflake to set (usually guildId or userId)
	 * @param scope The scope to set.
	 */
	public async setPermission(permission: string, value: boolean, snowflake?: string, scope?: PermissionScope): Promise<void> {
		let key = `${permission}`;
		if (scope) key = `${scope.scope}.${key}`;
		if (snowflake) key = `${snowflake}.${key}`;

		if (value == null) {
			this.permissions.delete(key);

			return;
		}

		this.permissions.set(key, value);
	}

	/**
	 * Checks permission for a given context (guild, channel, user)
	 * @param permission Permission to check
	 * @param snowflakes Snowflakes of the context
	 * @returns Tuple with [state, where] boolean if explicitly set, otherwise null
	 */
	public async checkPermission(permission: string, snowflakes?: MessageContext): Promise<[boolean, string]> {
		if (snowflakes.userId && await this.isOwner(snowflakes.userId)) return [true, 'owner'];

		// Global Check
		const globalCheck = await this.getPermission(permission);
		if (typeof globalCheck === 'boolean') return [globalCheck, 'global'];

		// Global User Check
		const userCheck = await this.getPermission(permission, snowflakes.userId);
		if (typeof userCheck === 'boolean') return [userCheck, 'user'];

		// Guild Checks
		if (snowflakes.guildId) {
			const guildId = snowflakes.guildId;
			const checks: Record<PermissionScopeType, Array<string | Array<string>>> = {
				// Advanced Permissions
				[PermissionScopeType.MEMBER_CHANNEL]: [snowflakes.userId, snowflakes.channelId], // Member (UserId) in Channel
				[PermissionScopeType.ROLE_CHANNEL]: [snowflakes.roleIds, snowflakes.channelId], // Role in Channel

				// General Permissions
				[PermissionScopeType.MEMBER]: [snowflakes.userId], // Member (UserId)
				[PermissionScopeType.ROLE]: [snowflakes.roleIds], // RoleId
				[PermissionScopeType.CHANNEL]: [snowflakes.channelId], // ChannelId
			};

			// Some Explications of this insanity:
			// - We loop over each check, and lookup the permission value.
			// - In most cases `scope` is just the direct snowflake (e.g. userId, roleId, channelId)
			// - However for advanced permissions, we append the remaining snowflakes (e.g. userId.channelId)
			// This results in a ordered list of checks of decreasing specificity.
			// Currently our checks, in order, are: User in Channel, Role in Channel, User, Role, Channel, Guild
			for (const [type, check] of Object.entries(checks) as Array<[PermissionScopeType, Array<string | Array<string>>]>) {
				const [first, ...rest] = check;

				// handle roleIds Array
				if (Array.isArray(first)) {
					for (const roleId of first) {
						let roleScope = roleId;
						if (rest.length) roleScope += `.${rest.join('.')}`;

						const v = await this.getPermission(permission, guildId, { type, scope: roleScope });
						if (typeof v === 'boolean') return [v, type];
					}

					continue;
				}

				let scope = first;
				if (rest.length) scope += `.${rest.join('.')}`;

				const value = await this.getPermission(permission, guildId, { type, scope });
				if (typeof value === 'boolean') return [value, type];
			}

			// Guild Wide Check
			const guildCheck = await this.getPermission(permission, guildId);
			if (typeof guildCheck === 'boolean') return [guildCheck, 'server'];
		}

		return [null, null];
	}

	public async resolveAlias(name: string, args: string, message: Message): Promise<Array<string>> {
		return [undefined, undefined];
	}
}
