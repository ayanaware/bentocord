/* eslint-disable @typescript-eslint/no-unused-vars */
import { Plugin, PluginAPI, Variable } from '@ayanaware/bento';

import { Message } from 'eris';

import { BentocordVariable } from './BentocordVariable';

export interface MessageSnowflakes {
	userId: string;
	channelId: string;
	guildId?: string;
	roleIds?: Array<string>;
}

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

	public async isOwner(userId: string): Promise<boolean> {
		const owners = this.owners.split(',').map(o => o.trim());
		return owners.includes(userId);
	}

	public async getPrefix(snowflake: string): Promise<string> {
		return this.prefixes.get(snowflake);
	}

	public async setPrefix(snowflake: string, prefix: string): Promise<void> {
		if (prefix == null) {
			this.prefixes.delete(snowflake);

			return;
		}

		this.prefixes.set(snowflake, prefix);
	}

	public async formatNumber(num: number, ctx?: Record<string, string>): Promise<string> {
		return null;
	}

	public async formatDate(date: Date, ctx?: Record<string, string>): Promise<string> {
		return null;
	}

	public async formatTranslation(key: string, repl?: Record<string, unknown>, ctx?: Record<string, string>): Promise<string> {
		return null;
	}

	/**
	 * Get the permission for a given snowflake.
	 * @param permission The permission to check.
	 * @param scope The scope to check.
	 * @param snowflake The snowflake to check (usually guildId or userId)
	 * @returns Whether the permission is allowed.
	 */
	public async getPermission(permission: string, scope?: string, snowflake?: string): Promise<boolean> {
		let key = `${permission}`;
		if (scope) key = `${scope}.${key}`;
		if (snowflake) key = `${snowflake}.${key}`;

		return this.permissions.get(key) || null;
	}

	/**
	 * Set the permission for a given snowflake.
	 * @param permission The permission to set.
	 * @param value Whether the permission is allowed.
	 * @param scope The scope to set.
	 * @param snowflake The snowflake to set (usually guildId or userId)
	 */
	public async setPermission(permission: string, value: boolean, scope?: string, snowflake?: string): Promise<void> {
		let key = `${permission}`;
		if (scope) key = `${scope}.${key}`;
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
	public async checkPermission(permission: string, snowflakes?: MessageSnowflakes): Promise<[boolean, string]> {
		if (snowflakes.userId && await this.isOwner(snowflakes.userId)) return [true, 'owner'];

		// Global User Check
		const userCheck = await this.getPermission(permission, null, snowflakes.userId);
		if (typeof userCheck === 'boolean') return [userCheck, 'user'];

		// Guild Checks
		if (snowflakes.guildId) {
			const guildId = snowflakes.guildId;
			const checks: Record<string, Array<string | Array<string>>> = {
				// Advanced Permissions
				memberChannel: [snowflakes.userId, snowflakes.channelId], // Member (UserId) in Channel
				roleChannel: [snowflakes.roleIds, snowflakes.channelId], // Role in Channel

				// General Permissions
				member: [snowflakes.userId], // Member (UserId)
				role: [snowflakes.roleIds], // RoleId
				channel: [snowflakes.channelId], // ChannelId
				guild: [null], // Guild Wide
			};

			// Some Explications of this insanity:
			// - We loop over each check, and lookup the permission value.
			// - In most cases `scope` is just the direct snowflake (e.g. userId, roleId, channelId)
			// - However for advanced permissions, we append the remaining snowflakes (e.g. userId.channelId)
			// This results in a ordered list of checks of decreasing specificity.
			// Currently our checks, in order, are: User in Channel, Role in Channel, User, Role, Channel, Guild
			for (const [name, check] of Object.entries(checks)) {
				const [first, ...rest] = check;

				// handle roleIds Array
				if (Array.isArray(first)) {
					for (const roleId of first) {
						let roleScope = roleId;
						if (rest.length) roleScope += `.${rest.join('.')}`;

						const v = await this.getPermission(permission, roleScope, guildId);
						if (typeof v === 'boolean') return [v, name];
					}

					continue;
				}

				let scope = first;
				if (rest.length) scope += `.${rest.join('.')}`;

				const value = await this.getPermission(permission, scope, guildId);
				if (typeof value === 'boolean') return [value, name];
			}
		}

		return [null, null];
	}

	public async resolveAlias(name: string, args: string, message: Message): Promise<void> {
		return null;
	}
}
