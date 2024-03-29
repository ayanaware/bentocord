/* eslint-disable @typescript-eslint/no-unused-vars */
import { Plugin, PluginAPI, Variable } from '@ayanaware/bento';

import { ActivityPartial, BotActivityType, Message } from 'eris';

import { BentocordVariable } from './BentocordVariable';
import type { LocalizedEmbedBuilder } from './builders/LocalizedEmbedBuilder';
import type { AnyCommandContext } from './commands/CommandContext';
import type { Command } from './commands/interfaces/Command';
import type { CommandPermissionDefaults } from './commands/interfaces/CommandDefinition';
import { DiscordPermission } from './discord/constants/DiscordPermission';
import type { MessageLocation } from './interfaces/MessageLocation';
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

	protected activity: ActivityPartial<BotActivityType>;

	/**
	 * Used to determine what shards this process controls.
	 * @returns Shard Data
	 */
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

	// HELP
	public async getHelpEmbed(embed: LocalizedEmbedBuilder): Promise<LocalizedEmbedBuilder> {
		const name = this.api.getProperty<string>('APPLICATION_NAME') || 'Bentocord';
		const version = this.api.getProperty('APPLICATION_VERSION') || '';

		embed.setAuthor(`${name} ${version}`);

		return embed;
	}

	// COMMAND

	/**
	 * Default & Required selfPermissions for command
	 * @param command Command
	 * @param ctx AnyCommandContext
	 * @returns Array<DiscordPermission>
	 */
	public async selfPermissions(command: Command, ctx: AnyCommandContext): Promise<Array<DiscordPermission>> {
		return [DiscordPermission.SEND_MESSAGES];
	}

	/**
	 * Allow's for domain-specific disabling of commands based on context.
	 * Useful for many things, but not limited to:
	 * - Disable free instance when paid instance is in the server
	 * - Simple blacklist functionality
	 * - Literally anything else you might want to check before running a command
	 * @param command Command
	 * @param ctx CommandContext
	 * @returns boolean Whether or not to continue execution of command
	 */
	public async checkCommand(command: Command, ctx: AnyCommandContext): Promise<boolean> {
		return true;
	}

	// PREFIXES

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

	public async resolveAlias(name: string, args: string, message: Message): Promise<Array<string>> {
		return [undefined, undefined];
	}

	// LOCALIZATION

	public async formatNumber(num: number, ctx?: Record<string, string>): Promise<string> {
		return null;
	}

	public async formatDate(date: Date, ctx?: Record<string, string>): Promise<string> {
		return null;
	}

	/**
	 * Get locale code for a given context.
	 * @param ctx Translation Context (Snowflakes)
	 * @returns Locale Code
	 */
	public async getLocale(ctx: Record<string, string>): Promise<string> {
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

	// PERMISSIONS

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
	 * Find permission override for a given context (guild, channel, user)
	 * @param permission Permission to check
	 * @param snowflakes Snowflakes of the context
	 * @returns Tuple with [state, where] boolean if explicitly set, otherwise null
	 */
	public async findPermission(permission: string, snowflakes?: MessageLocation): Promise<[boolean, string]> {
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

	/**
	 * Check if ctx has a given permission.
	 * @param ctx CommandContext
	 * @param perm Permission
	 * @param def Permission defaults
	 * @returns Whether context has the provided permission.
	 */
	public async checkPermission(ctx: AnyCommandContext, perm: string | Array<string>, def?: CommandPermissionDefaults | boolean): Promise<boolean> {
		// convert permission to "." separated string
		if (Array.isArray(perm)) perm = perm.join('.');

		// bot-owner bypass (bot owner has all permissions)
		if (await this.isOwner(ctx.userId)) return true;

		// get defaults
		let defaults = def ?? { user: true, admin: true };
		if (typeof defaults === 'boolean') defaults = { user: defaults, admin: true };

		// create messagecontext
		const permCtx: MessageLocation = { userId: ctx.userId, channelId: ctx.channelId };
		if (ctx.guildId) permCtx.guildId = ctx.guildId;
		if (ctx.member?.roles) permCtx.roleIds = ctx.member.roles;

		// explicit check
		const checks = [perm];

		// prevent explicit-only permissions from being modified via 'all' checks
		// such permissions should only be explicitly granted by a bot owner
		if (defaults.user || defaults.admin) {
			// "all.category" check
			const category = ctx.command.definition.category;
			if (category) checks.push(`all.${category}`);

			// "all" check
			checks.push('all');
		}

		// cache guild-admin check
		const isGuildAdmin = ctx.member && ctx.member.permissions.has('administrator');

		// loop checks, break on explicit state
		for (const permission of checks) {
			const [state, where] = await this.findPermission(permission, permCtx);
			if (typeof state !== 'boolean') continue;
			// override found

			// explicit allow
			if (state) return true;

			// explicit deny
			if (where === 'global') {
				await ctx.createTranslatedResponse('BENTOCORD_PERMISSION_GLOBAL_DENIED', { permission },
					'Permission `{permission}` is denied globally. As this can only be done by a bot owner, it was likely intentional.');
			} else if (where === 'user') {
				await ctx.createTranslatedResponse('BENTOCORD_PERMISSION_USER_DENIED', { permission },
					'Permission `{permission}` is globally denied for you. As this can only be done by a bot owner, it was likely intentional.');
			} else {
				// guild-admin bypass: unless revoked globally, guild-admin has all admin permissions, prevents lockout
				if (defaults.admin && isGuildAdmin) return true;

				await ctx.createTranslatedResponse('BENTOCORD_PERMISSION_DENIED', { permission, where },
					'Permission `{permission}` has been denied on the `{where}` level.');
			}

			return false;
		}

		// no override found
		// guild-admin bypass: guild-admin has all admin permissions
		if (defaults.admin && isGuildAdmin) return true;

		// check if default allowed
		if (defaults.user) return true;

		// default denied
		await ctx.createTranslatedResponse('BENTOCORD_PERMISSION_DENIED_DEFAULT', { permission: perm },
			'Permission `{permission}` is denined by default. Please contact a server administrator to grant you this permission.');

		return false;
	}
}
