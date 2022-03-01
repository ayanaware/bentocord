export enum PermissionScopeType {
	MEMBER_CHANNEL = 'memberChannel',
	ROLE_CHANNEL = 'roleChannel',
	MEMBER = 'member',
	ROLE = 'role',
	CHANNEL = 'channel',
}

export interface PermissionScope<T = PermissionScopeType> {
	type: T;
	scope: string;
}
