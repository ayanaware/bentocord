## @ayanaware/bentocord [![npm (scoped)](https://img.shields.io/npm/v/@ayanaware/bentocord.svg)](https://www.npmjs.com/package/@ayanaware/bentocord) [![Discord](https://discordapp.com/api/guilds/508903834853310474/embed.png)](https://discord.gg/eaa5pYf) [![install size](https://packagephobia.now.sh/badge?p=@ayanaware/bentocord)](https://packagephobia.now.sh/result?p=@ayanaware/bentocord)
Bentocord is a Bento plugin designed to rapidly build fully functional Discord Bots. But stay powerful enough that you never have to leave

## Bootstrap
With most things Bento you have a lot of options when bootstrapping Bentocord. However we highly recommend usings Bento's [Application]() helper. It is the most painless way to get up and running:
```ts
import { Application } from '@ayanaware/bento';
import { Bentocord } from '@ayanaware/bentocord';

// Create our Application instance
const app = new Application();

// Anonymous async function so we can use await
(async () => {
	await app.start();

	// Add Bentocord
	await app.bento.addPlugin(Bentocord);

	await app.verify();
})().catch(e => {
	console.log(e);
	process.exit(1);
});

```

## Bentocord Variables
Bento variables are used to change the behavior of Bentocord. They can be set various different ways.
Some common ways are to use Bento's built in `VariableLoader` or `VariableFileLoader` plugins.
You can also bring your own plugin or alternativly directly inject values via `Bento.setVariable()`.

>Note: While some variables are dynamic and Bentocord reacts as soon as you update them. Some are not.
This means Bentocord expects you to set all Variables you care about before `Bento.addPlugin()`

Key | Type | Description | Default
--- | --- | --- | ---
BENTOCORD_TOKEN | string | [Discord Authentication Token](https://discord.com/developers/docs/intro#bots-and-apps) | null
BENTOCORD_BOT_OWNERS | list* | Discord user id list | null
BENTOCORD_IGNORE_MODE | boolean | This will disable much of the bot for users not in `BENTOCORD_BOT_OWNERS` | false
BENTOCORD_COMMAND_PREFIX | string | The default prefix to use for Bentocord's Command Handler | bentocord
BENTOCORD_ACTIVITY_NAME | string | The default activity name to set per shard | with Bentocord
BENTOCORD_BUILTIN_COMMANDS | boolean | Should Bentocord load it's built-in Commands (ex: ping, bento) | true

>\* = comma seperated list of items


## Bentocord Interface
Bentocord uses a replaceable entity, [BentocordInterface](https://gitlab.com/ayanaware/bentocord/-/blob/master/lib/BentocordInterface.ts), to offer extendable functionality. Bentocord tries to offer sane defaults but for things like Storage, Localization, and other Application specific features you will need to provide a replacement entity. I often refer to this replacement entity as BentocordOverride.


It should be easy enough to implement your BentocordOverride. Simply create a normal Bento Entity. Extend BentocordInterface and override functions you wish to take control over. You can find all the functions and their description [here](https://gitlab.com/ayanaware/bentocord/-/blob/master/lib/BentocordInterface.ts). Then simply make use of `bento.replaceEntity()`.

>**IMPORTANT**: A BentocordOverride implementation should include basic caching for many of the possibly "expensive" calls. Such as `getPrefix`, `formatTranslation`, and many more. Functions such as these can and will be hit many times a second, and only increase as your bot grows. Some of these call's even take place on `MESSAGE_CREATE`. It is extreamly bad practice to hit your backend every call. Both for your backends sake and application responsiveness to your users. So add some caching :)

