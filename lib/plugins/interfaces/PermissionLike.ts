import { Entity } from '@ayanaware/bento';

/**
 * Describes the structure of a basic Permission System
 * 
 * Permission = A Key that that can be either true or false (ex: ping)
 * Group = Permission value is unique to this group (ex: guildId)
 * Scope = Further narrows a Permission to be unique to Group and Scope (ex: userId, roleId)
 * 
 * Above is more fancy way of saying that:
 * hasPermission('ping', 'guildId')` and `hasPermission('ping', 'guildId', 'userId')`
 * are expected to return different values
 */
export interface PermissionLike extends Entity {
	/**
	 * Bypasses all permissions. Akin to "root"
	 * @param userId UserId
	 */
	isOwner(userId: string): boolean;

	/**
	 * Check if any groups have permission granted
	 * @param permission Permission
	 * @param group Groups
	 * @param scope Scope
	 */
	hasPermission(permission: string, group?: string, scopes?: Array<string>): Promise<boolean | null>

	/**
	 * Grant permission for group
	 * @param permission Permission
	 * @param group Group
	 * @param scope Scope
	 */
	grantPermission(permission: string, group?: string, scope?: string): Promise<any>;

	/**
	 * Revoke permission for group
	 * @param permission Permission
	 * @param group Group
	 * @param scope Scope
	 */
	revokePermission(permission: string, group?: string, scope?: string): Promise<any>;
}