import { ComponentAPI, Inject } from '@ayanaware/bento';

import { Bentocord } from '../Bentocord';
import { BentocordVariable } from '../BentocordVariable';
import { PermissionLike } from './interfaces';
import { Storage } from './Storage';

export class Permissions implements PermissionLike {
	public name = '@ayanaware/bentocord:Permissions';
	public api!: ComponentAPI;
	public replaceable = true;

	private owners: Set<string> = new Set();

	@Inject() private bentocord: Bentocord;
	@Inject() private storage: Storage;

	public async onLoad() {
		// fill owners
		const owners = this.api.getVariable<string>({ name: BentocordVariable.BENTOCORD_BOT_OWNERS, default: null });
		if (owners) owners.split(',').forEach(i => this.owners.add(i));
	}

	public isOwner(userId: string) {
		return this.owners.has(userId);
	}

	public async hasPermission(permission: string, group?: string, scopes?: Array<string>) {
		if (this.isOwner(group)) return true;

		// Loop scopes
		for (const scope of scopes) {
			if (this.isOwner(scope)) return true;

			const value = this.storage.get<boolean>(`${permission}.${scope}`);

			if (value != null) return value;
		}

		return this.storage.get<boolean>(permission, group);
	}

	public async grantPermission(permission: string, group?: string, scope?: string) {
		if (scope) permission = `${permission}.${scope}`;

		return this.storage.set<boolean>(permission, true, group);
	}

	public async revokePermission(permission: string, group?: string, scope?: string) {
		if (scope) permission = `${permission}.${scope}`;

		return this.storage.set<boolean>(permission, false, group);
	}
}
