import { Plugin, PluginAPI, Variable } from '@ayanaware/bento';

import { BentocordVariable } from './BentocordVariable';

export interface MessageSnowflakes {
	userId: string;
	channelId: string;
	guildId?: string;
	roleIds?: Array<string>;
}

export interface ShardData {
	shardIds: Array<number>;
	shardCount: number;
}

// TODO: Add documentation
export class BentocordInterface implements Plugin {
	public name = '@ayanaware/bentocord:Interface';
	public api!: PluginAPI;

	public replaceable = true;

	@Variable({ name: BentocordVariable.BENTOCORD_BOT_OWNERS, default: null })
	private readonly owners: string;

	private readonly prefixes: Map<string, string> = new Map();
	private readonly permissions: Map<string, boolean> = new Map();

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

	public async setPrefix(prefix: string, snowflake: string): Promise<void> {
		if (prefix == null) {
			this.prefixes.delete(snowflake);

			return;
		}

		this.prefixes.set(snowflake, prefix);
	}

	public async getPermission(permission: string, snowflake?: string, guildId?: string): Promise<boolean> {
		let key = `${permission}`;
		if (snowflake) key = `${snowflake}.${key}`;
		if (guildId) key = `${guildId}.${key}`;

		return this.permissions.get(key) || null;
	}

	public async setPermission(permission: string, value: boolean, snowflake?: string, guildId?: string): Promise<void> {
		let key = `${permission}`;
		if (snowflake) key = `${snowflake}.${key}`;
		if (guildId) key = `${guildId}.${key}`;

		if (value == null) {
			this.permissions.delete(key);

			return;
		}

		this.permissions.set(key, value);
	}

	public async resolvePermission(permission: string, snowflakes?: MessageSnowflakes): Promise<boolean> {
		if (snowflakes.userId && await this.isOwner(snowflakes.userId)) return true;

		// Global User Check
		const userCheck = await this.getPermission(permission, snowflakes.userId);
		if (typeof userCheck === 'boolean') return userCheck;

		// Guild Checks
		if (snowflakes.guildId) {
			const checks: Array<Array<string | Array<string>>> = [
				[snowflakes.userId, snowflakes.guildId], // User in Guild
				[snowflakes.channelId, snowflakes.guildId], // Channel in Guild
				[snowflakes.roleIds, snowflakes.guildId], // RoleId in Guild
				[null, snowflakes.guildId], // Guild Wide
			];

			for (const check of checks) {
				if (typeof check[1] !== 'string') continue;

				// Handle roleIds
				if (typeof check[0] === 'object' && Array.isArray(check[0])) {
					for (const roleId of check[0]) {
						const v = await this.getPermission(permission, roleId, check[1]);
						if (typeof v === 'boolean') return v;
					}
					continue;
				}

				const value = await this.getPermission(permission, check[0], check[1]);
				if (typeof value === 'boolean') return value;
			}
		}

		return null;
	}
}
