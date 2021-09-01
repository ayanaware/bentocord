import { Application, EntityType } from '@ayanaware/bento';
import { Bentocord, CommandContext, CommandEntity, CommandManager } from '@ayanaware/bentocord';
import { CommandOption } from '@ayanaware/bentocord/commands/interfaces/CommandOption';
import { ApplicationCommandOptionType } from 'discord-api-types';

(async () => {
	const app = new Application({ variables: [[__dirname, '..', '..', 'env.json']] });
	await app.start();

	await app.bento.addPlugin(new Bentocord());

	await app.verify();

	// lets add a custom type to commandmanager
	const cm = app.bento.getComponent(CommandManager);

	cm.addResolver({
		type: 'pog',
		convert: ApplicationCommandOptionType.String,
		async resolve(ctx: CommandContext, option: CommandOption, input) {
			// count how many time pog appears in input
			return (input.match(/pog/gi) || []).length;
		}
	});

	app.bento.addEntity({
		name: 'pogcounttest',
		type: EntityType.COMPONENT,
		parent: CommandManager,
		definition: {
			aliases: ['pogcounter'],
			description: 'count pogs in a string',
			options: [
				{ type: 'pog', array: true, name: 'pogCount', description: 'input string', rest: true }
			]
		},
		async execute(ctx: CommandContext, options: { pogCount: Array<number> }) {
			return ctx.createResponse({ content: `I saw ${options.pogCount.toString()} pogs` })
		}
	} as CommandEntity);
})().catch(e => {
	console.log(e);
	process.exit(1);
});
