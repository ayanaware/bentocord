import { Application, EntityType } from '@ayanaware/bento';
import { Bentocord, CommandContext, CommandEntity, CommandManager } from '@ayanaware/bentocord';
import { CommandOption } from '@ayanaware/bentocord/commands/interfaces/CommandOption';
import Logger, { LogLevel } from '@ayanaware/logger';
import { ApplicationCommandOptionType } from 'discord-api-types';

Logger.getDefaultTransport().setLevel(LogLevel.DEBUG);

(async () => {
	const app = new Application({ variables: [[__dirname, '..', '..', 'env.json']] });
	await app.start();

	await app.bento.addPlugin(new Bentocord());

	await app.verify();

	// lets add a custom type to commandmanager
	const cm = app.bento.getComponent(CommandManager);

	cm.addResolver({
		option: 'pog',
		convert: ApplicationCommandOptionType.String,
		async resolve(ctx: CommandContext, option: CommandOption, input) {
			// count how many time pog appears in input
			return (input.match(/pog/gi) || []).length;
		}
	});

	cm.addCommand({
		definition: {
			aliases: ['pogcounter'],
			description: 'count pogs in a string',
			options: [
				{ type: 'pog', name: 'count', array: true, description: 'input string', rest: true }
			]
		},
		async execute(ctx: CommandContext, options: { count: number }) {
			return ctx.createResponse({ content: `I saw ${options.count.toString()} pogs` })
		}
	});
})().catch(e => {
	console.log(e);
	process.exit(1);
});
