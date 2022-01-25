import { Application } from '@ayanaware/bento';
import { AnyValueCommandOption, Bentocord, CommandContext, CommandManager } from '@ayanaware/bentocord';
import Logger, { LogLevel } from '@ayanaware/logger';
import { Constants } from 'eris';

Logger.getDefaultTransport().setLevel(LogLevel.DEBUG);

(async () => {
	const app = new Application({ variables: [[__dirname, '..', '..', 'env.json']] });
	await app.start();

	await app.bento.addPlugin(new Bentocord());

	await app.verify();

	// lets add a custom type to commandmanager
	const cm = app.bento.getComponent(CommandManager);

	//cm.addResolver({
	//	option: 'pog',
	//	convert: Constants.ApplicationCommandOptionTypes.STRING,
	//	async resolve(ctx: CommandContext, option: AnyValueCommandOption, input) {
	//		// count how many time pog appears in input
	//		return (input.match(/pog/gi) || []).length;
	//	}
	//});

	//cm.addCommand({
	//	definition: {
	//		aliases: ['pogcounter'],
	//		description: 'count pogs in a string',
	//		options: [
	//			{ type: 'pog', name: 'count', array: true, description: 'input string', rest: true }
	//		]
	//	},
	//	async execute(ctx: CommandContext, options: { count: number }) {
	//		return ctx.createResponse({ content: `I saw ${options.count.toString()} pogs` })
	//	}
	//});
})().catch(e => {
	console.log(e);
	process.exit(1);
});
