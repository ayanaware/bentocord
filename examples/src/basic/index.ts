import { Bento, FSComponentLoader, VariableFileLoader } from '@ayanaware/bento';
import { Bentocord, BentocordVariable } from '@ayanaware/bentocord';

const bento = new Bento();

(async () => {
	const vfl = new VariableFileLoader();
	vfl.addVariable(BentocordVariable.BENTOCORD_TOKEN);
	await vfl.addFile([__dirname, '..', '..', 'env.json']);

	const bentocord = new Bentocord();

	const fsloader = new FSComponentLoader();
	await fsloader.addDirectory(__dirname, 'components');

	await bento.addPlugin(vfl);
	if (!bento.hasVariable(BentocordVariable.BENTOCORD_TOKEN)) throw new Error(`Please append ${BentocordVariable.BENTOCORD_TOKEN}=xxx to the front of your command`);

	await bento.addPlugins([bentocord, fsloader]);

	await bento.verify();
})().catch(e => {
	console.log(e);
	process.exit(1);
});