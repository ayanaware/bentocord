import { Application } from '@ayanaware/bento';
import { Bentocord } from '@ayanaware/bentocord';

(async () => {
	const app = new Application({ variables: [[__dirname, '..', '..', 'env.json']] });
	await app.start();

	await app.bento.addPlugin(new Bentocord());

	await app.verify();
})().catch(e => {
	console.log(e);
	process.exit(1);
});
