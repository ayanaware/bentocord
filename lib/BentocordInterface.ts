import { Plugin, PluginAPI, Variable } from '@ayanaware/bento';
import { BentocordVariable } from './BentocordVariable';

export class MessageFlakes {
	userId: string;
	channelId: string;
	guildId?: string;
	roleIds?: Array<string>;
}

// TODO: Add documentation
export class BentocordInterface implements Plugin {
	public name = '@ayanaware/bentocord:Interface';
	public api!: PluginAPI;

	public replaceable = true;

	@Variable({ name: BentocordVariable.BENTOCORD_BOT_OWNERS, default: null })
	private owners: string;

	private prefixes: Map<string, string> = new Map();
	private permissions: Map<string, boolean> = new Map();

	public async isOwner(userId: string): Promise<boolean> {
		const owners = this.owners.split(',').map(o => o.trim());
		
		return owners.includes(userId);
	}

	public async getPrefix(flake: string): Promise<string> {
		return this.prefixes.get(flake);
	}

	public async setPrefix(prefix: string, flake: string): Promise<void> {
		if (prefix == null) {
			this.prefixes.delete(flake);

			return;
		}

		this.prefixes.set(flake, prefix);
	}

	public async getPermission(permission: string, flake?: string, guildId?: string): Promise<boolean> {
		let key = `${permission}`;
		if (flake) key = `${flake}.${key}`;
		if (guildId) key = `${guildId}.${key}`;

		return this.permissions.get(key) || null;
	}

	public async setPermission(permission: string, value: boolean, flake?: string, guildId?: string): Promise<void> {
		let key = `${permission}`;
		if (flake) key = `${flake}.${key}`;
		if (guildId) key = `${guildId}.${key}`;

		if (value == null) {
			this.permissions.delete(key);

			return;
		}

		this.permissions.set(key, value);
	}

	public async resolvePermission(permission: string, flakes?: MessageFlakes): Promise<boolean> {
		if (flakes.userId && await this.isOwner(flakes.userId)) return true;

		// Global User Check
		const userCheck = await this.getPermission(permission, flakes.userId);
		if (typeof userCheck === 'boolean') return userCheck;

		// Guild Checks
		if (flakes.guildId) {
			const checks: Array<Array<string | Array<string>>> = [
				[flakes.userId, flakes.guildId], // User in Guild
				[flakes.channelId, flakes.guildId], // Channel in Guild
				[flakes.roleIds, flakes.guildId], // RoleId in Guild
				[null, flakes.guildId], // Guild Wide
			];

			for (const check of checks) {
				if (typeof check[1] !== 'string') continue;

				// Handle roleIds
				if (typeof check[0] === 'object' && Array.isArray(check[0])) {
					for (const roleId of check[0]) {
						const value = await this.getPermission(permission, roleId, check[1]);
						if (typeof value === 'boolean') return value;
					}
					continue;
				}

				const value = await this.getPermission(permission, check[0], check[1])
				if (typeof value === 'boolean') return value;
			}
		}

		return null;
	}
}
