import * as fs from 'fs-extra';
import * as path from 'path';
import War3Map from 'mdx-m3-viewer-th/dist/cjs/parsers/w3x/map';
import { compileMap, getFilesInDirectory, loadJsonFile, logger, toArrayBuffer, IProjectConfig, toBuffer } from './utils';
import War3MapW3i from 'mdx-m3-viewer-th/dist/cjs/parsers/w3x/w3i/file';
import War3MapWts from 'mdx-m3-viewer-th/dist/cjs/parsers/w3x/wts/file';

function main() {
	const config: IProjectConfig = loadJsonFile('config.json');
	const minify = process.argv[2] === '-minify' || config.minifyScript;

	if (minify !== config.minifyScript) {
		logger.warn(`minifyScript has been overridden by command line argument "-minify"`);
		config.minifyScript = minify;
	}

	updateTsFileWithConfig();

	const result = compileMap(config);

	if (!result) {
		logger.error(`Failed to compile map.`);
		return;
	}

	logger.info(`Creating w3x archive...`);
	if (!fs.existsSync(config.outputFolder)) {
		fs.mkdirSync(config.outputFolder);
	}

	const w3cModeEnabled = `${config.w3cModeEnabled}` == 'true';

	const distDir = `./dist/${config.mapFolder}`;
	const ddsDir = path.join(__dirname, '..', distDir, 'war3mapPreview.dds');
	const mapName = `${config.mapName} ${config.mapVersion}${w3cModeEnabled ? ' w3c' : ''}.w3x`;
	const formattedMapName = mapName.replaceAll(' ', '_');

	if (fs.existsSync(ddsDir)) {
		const copyDest = path.join(__dirname, '..', distDir, 'war3mapMap.dds');
		fs.renameSync(ddsDir, copyDest);
	}

	createMapFromDir(`${config.outputFolder}/${formattedMapName}`, distDir);
}

/**
 * Creates a w3x archive from a directory
 * @param output The output filename
 * @param dir The directory to create the archive from
 */
export function createMapFromDir(output: string, dir: string) {
	const map = new War3Map();
	const files = getFilesInDirectory(dir);

	updateStrings(
		files.find((filename) => filename.indexOf('.wts') >= 0),
		files.find((filename) => filename.indexOf('.w3i') >= 0),
		loadJsonFile('config.json')
	);

	map.archive.resizeHashtable(files.length);

	for (const fileName of files) {
		const contents = toArrayBuffer(fs.readFileSync(fileName));
		const archivePath = path.relative(dir, fileName);
		const imported = map.import(archivePath, contents);

		if (!imported) {
			logger.warn('Failed to import ' + archivePath);
			continue;
		}
	}

	const result = map.save();

	if (!result) {
		logger.error('Failed to save archive.');
		return;
	}

	fs.writeFileSync(output, new Uint8Array(result));

	logger.info('Finished!');
}

function updateStrings(wtsDir: string | undefined, w3iDir: string | undefined, configs: IProjectConfig) {
	if (!wtsDir) throw Error('wts not found');
	if (!w3iDir) throw Error('w3i not found');

	let wtsBuffer = fs.readFileSync(wtsDir, 'utf8');

	const wts = new War3MapWts();

	wts.load(wtsBuffer);
	wts.setString(configs.mapNameStringId, `|cffffcc00${configs.mapName} ${configs.mapVersion}|r`);

	wtsBuffer = wts.save();
	fs.writeFileSync(wtsDir, wtsBuffer);
}

function updateTsFileWithConfig() {
	const config: IProjectConfig = loadJsonFile('config.json');
	const tsFilePath = path.join(__dirname, '..', 'src/app/utils', 'map-info.ts'); // Replace with your file path
	const w3cModeEnabled = `${config.w3cModeEnabled}` == 'true';

	const fileContent = `
	//Do not edit - this will automatically update based on the project config.json upon building the map
	export const MAP_NAME: string = '${config.mapName}';
	export const MAP_VERSION: string = '${config.mapVersion}';
	export const W3C_MODE_ENABLED: boolean = ${w3cModeEnabled};
  `;

	fs.writeFileSync(tsFilePath, fileContent);
}

main();
