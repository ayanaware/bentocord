import { Application } from '@ayanaware/bento';
import { Bentocord, CommandManager } from '@ayanaware/bentocord';

(async () => {
	const app = new Application({ variables: [[__dirname, '..', '..', 'env.json']] });
	await app.start();

	await app.bento.addPlugin(new Bentocord());

	await app.verify();

	const cm = app.bento.getComponent(CommandManager);

	const slashCommands = cm.convertCommands();

	const result = await cm.syncCommands(slashCommands, '508903834853310474');

	console.log(JSON.stringify(result, null, 2));
})().catch(e => {
	console.log(e);
	process.exit(1);
});
