# @ayanaware/bentocord [![npm (scoped)](https://img.shields.io/npm/v/@ayanaware/bentocord.svg)](https://www.npmjs.com/package/@ayanaware/bentocord) [![Discord](https://discordapp.com/api/guilds/508903834853310474/embed.png)](https://discord.gg/eaa5pYf) [![install size](https://packagephobia.now.sh/badge?p=@ayanaware/bentocord)](https://packagephobia.now.sh/result?p=@ayanaware/bentocord)
Bentocord is a Bento plugin designed to rapidly build fully functional Discord Bots. But stay powerful enough that you never have to leave

## Bento Variables
Bento Variables are used to change the behavior of Bentocord. They can be set various different ways.
Some common ways are to use Bento's built in `VariableLoader` or `VariableFileLoader` plugins.
You can also bring your own plugin or alternativly directly inject values via `Bento.setVariable()`.

>Note: While some variables are dynamic and Bentocord reacts as soon as you update them. Some are not.
This means Bentocord expects you to set all Variables you care about before `Bento.addPlugin()`

Key | Type | Description | Default
--- | --- | --- | ---
BENTOCORD_TOKEN | string | [Discord Authentication Token](https://discord.com/developers/docs/intro#bots-and-apps) | null
BENTOCORD_BOT_OWNERS | list | Discord user id list | null
BENTOCORD_COMMAND_PREFIX | string | The default prefix to use for Bentocord's Command Handler | bentocord
BENTOCORD_BUILTIN_COMMANDS | boolean | Should Bentocord load it's built-in Commands (ex: ping, bento) | true
BENTOCORD_STORAGE_ENTITY | EntityReference | A [StorageLike](#storagelike) Entity Bentocord uses for persistentance | null*
BENTOCORD_PERMISSIONS_ENTITY | EntityReference | A [PermissionLike](#permissionlike) Entity Bentocord uses for permissions | null*

\* This is a required system for Bentocord. If `null` Bentocord will automatically create and use a default.
See more details below.

## Special Types
Type | Description
--- | ---
list | Comma seperated string of items
EntityReference | A `string | Function | Entity`. Bentocord will attempt to resolve it

## StorageLike
[StorageLike](https://gitlab.com/ayanaware/bentocord/-/blob/master/lib/plugins/interfaces/StorageLike.ts) is an abstraction
Bentocord uses to allow for persitant storage. [SimpleStorage](https://gitlab.com/ayanaware/bentocord/-/blob/master/lib/plugins/SimpleStorage.ts)
is used by default, however this is only persisted in ram, while the bot is running.
We strongly recommend creating a custom implementation for your Bot

**IMPORTANT**: A StorageLike implementation should include a cache for reading from and potentially based
on the backend a write cache as well. The functions in StorageLike can and will be hit many times a second
based on the scale of your bot. Some calls even take place on `MESSAGE_CREATE`. It is extremly bad practice to
hit your backend every call. Both for your backend and responsiveness to the user.

#### Why?
Storage is used for internal features. A good example is per guild prefix functionality.
The CommandManager invokes `StorageLike.get('prefix', guildId)`, when looking for a custom prefix.
If this data is not persisted users may get frusturated having to reset their custom prefix evertime
your Bot is restarted.

It should be relatively easy to implement a StorageLike Entity. Simply create a normal
Bento Entity (Plugin(preferred) or Component). Extend StorageLike and implement the missing functions. You can find all required functions [here](https://gitlab.com/ayanaware/bentocord/-/blob/master/lib/interfaces/StorageLike.ts).

## PermissionLike
[PermissionLike](https://gitlab.com/ayanaware/bentocord/-/blob/master/lib/plugins/interfaces/PermissionLike.ts) is an abstraction
Bentocord uses to handle permissions. [SimplePermissions](https://gitlab.com/ayanaware/bentocord/-/blob/master/lib/plugins/SimplePermissions.ts)
is used by default. And should be sufficent for most applications