import { Bento, FSComponentLoader } from '@ayanaware/bento';
import { Bentocord, BentocordVariable } from '@ayanaware/bentocord';

const bento = new Bento();

(async () => {
	const key = BentocordVariable.BENTOCORD_TOKEN;
	if (!process.env[key]) throw new Error(`Please append ${key}=xxx to the front of your command`);

	const bentocord = new Bentocord();
	bento.setVariable(key, process.env[key]);

	const fsloader = new FSComponentLoader();
	await fsloader.addDirectory(__dirname, 'components');

	await bento.addPlugins([fsloader, bentocord]);

	await bento.verify();
})().catch(e => {
	console.log(e)
	process.exit(1);
});