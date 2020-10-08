import { Bento, FSComponentLoader } from '@ayanaware/bento';
import { Bentocord } from '@ayanaware/bentocord';

const bento = new Bento();

(async () => {
	const tokenKey = 'BOT_TOKEN';
	if (!process.env[tokenKey]) throw new Error(`Please append ${tokenKey}=xxx to the front of your command`);

	const bentocord = new Bentocord(tokenKey);
	bento.setVariable('BOT_TOKEN', process.env[tokenKey]);

	const fsloader = new FSComponentLoader();
	await fsloader.addDirectory(__dirname, 'components');

	await bento.addPlugins([fsloader, bentocord]);

	await bento.verify();
})().catch(e => console.log(e));