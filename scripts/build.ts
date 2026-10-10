import * as fs from 'fs-extra';
import * as path from 'path';
import War3Map from 'mdx-m3-viewer-th/dist/cjs/parsers/w3x/map';
import { compileMap, getFilesInDirectory, loadJsonFile, loadTerrainConfig, logger, toArrayBuffer, IProjectConfig, toBuffer, updateTsFileWithConfig } from './utils';
import War3MapW3i from 'mdx-m3-viewer-th/dist/cjs/parsers/w3x/w3i/file';
import War3MapWts from 'mdx-m3-viewer-th/dist/cjs/parsers/w3x/wts/file';

// Highest w3i version mdx-m3-viewer-th can parse. Anything above this is handled by
// allowNewerMapInfoVersions below.
const MAX_PARSABLE_W3I_VERSION = 33;
const W3I_HEADER_BYTES = 28;

function main() {
	// Get terrain from command line args (e.g., npm run build europe)
	// Support -minify flag as well
	let terrain: string | undefined;
	let minifyOverride: boolean | undefined;

	for (let i = 2; i < process.argv.length; i++) {
		if (process.argv[i] === '-minify') {
			minifyOverride = true;
		} else {
			terrain = process.argv[i];
		}
	}

	// If no terrain specified, build all terrains
	if (!terrain) {
		logger.info('No terrain specified. Building all terrains...');
		const terrains = ['asia', 'europe'];
		for (const t of terrains) {
			logger.info(`\n=== Building ${t} ===`);
			buildTerrain(t, minifyOverride);
		}
		logger.info('\nAll terrains built successfully!');
		return;
	}

	buildTerrain(terrain, minifyOverride);
}

function buildTerrain(terrain: string, minifyOverride?: boolean) {
	const config: IProjectConfig = loadTerrainConfig(terrain);
	const minify = minifyOverride !== undefined ? minifyOverride : config.minifyScript;

	if (minify !== config.minifyScript) {
		logger.warn(`minifyScript has been overridden by command line argument "-minify"`);
		config.minifyScript = minify;
	}

	const restoreMapInfo = updateTsFileWithConfig(config);

	try {
		// compileMap will sync object editor files from risk_europe to dist/ automatically
		const result = compileMap(config);

		if (!result) {
			logger.error(`Failed to compile map.`);
			return;
		}

		logger.info(`Creating w3x archive...`);

		// Fall back to ./dist when OUTPUT_FOLDER is not set in .env
		const outputFolder = config.outputFolder || './dist';
		fs.mkdirSync(outputFolder, { recursive: true });

		const w3cModeEnabled = `${config.w3cModeEnabled}` == 'true';

		const distDir = `./dist/${config.mapFolder}`;
		const ddsDir = path.join(__dirname, '..', distDir, 'war3mapPreview.dds');
		const mapName = `${config.mapName} ${config.mapVersion}${w3cModeEnabled ? ' w3c' : ''}.w3x`;
		const formattedMapName = mapName.replaceAll(' ', '_');

		if (fs.existsSync(ddsDir)) {
			const copyDest = path.join(__dirname, '..', distDir, 'war3mapMap.dds');
			fs.renameSync(ddsDir, copyDest);
		}

		createMapFromDir(`${outputFolder}/${formattedMapName}`, distDir, config);
	} finally {
		restoreMapInfo();
	}
}

/**
 * Creates a w3x archive from a directory
 * @param output The output filename
 * @param dir The directory to create the archive from
 * @param config The project configuration
 */
export function createMapFromDir(output: string, dir: string, config: IProjectConfig) {
	const map = new War3Map();
	const files = getFilesInDirectory(dir);
	const w3iFile = files.find((filename) => filename.indexOf('.w3i') >= 0);

	updateStrings(
		files.find((filename) => filename.indexOf('.wts') >= 0),
		w3iFile,
		config
	);

	allowNewerMapInfoVersions(map, w3iFile);

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

/**
 * The w3i parser in mdx-m3-viewer-th only understands map info versions up to 33, but World
 * Editor 3.0 writes version 39. Saving the map in the editor therefore used to break the build
 * with a ByteStream error until war3map.w3i was restored by hand - which also threw away
 * whatever had just been changed in Map Properties.
 *
 * map.save() parses the w3i for exactly one decision: maps built before patch 1.31 need the
 * legacy 512 byte HM3W header prepended, newer ones must not have it. The game version is at a
 * fixed offset in every w3i from version 28 onwards, so for a file the parser cannot read we
 * answer that one question ourselves and leave the file itself untouched in the archive.
 */
function allowNewerMapInfoVersions(map: War3Map, w3iFile: string | undefined) {
	if (!w3iFile) return;

	const header = readW3iHeader(w3iFile);

	if (!header || header.version <= MAX_PARSABLE_W3I_VERSION) return;

	const buildVersion = header.gameVersionMajor * 100 + header.gameVersionMinor;

	logger.info(
		`war3map.w3i is version ${header.version} (editor newer than the parser supports); using game version ${buildVersion} from its header`
	);

	// Only getBuildVersion() is ever read off the result, and only to compare against 131.
	map.getMapInformation = () => ({ getBuildVersion: () => buildVersion }) as unknown as War3MapW3i;
}

/**
 * Reads the fixed-position prologue of a w3i: version, then the four game version fields that
 * every version from 28 onwards carries.
 */
function readW3iHeader(file: string): { version: number; gameVersionMajor: number; gameVersionMinor: number } | undefined {
	const buffer = fs.readFileSync(file);

	if (buffer.length < W3I_HEADER_BYTES) return undefined;

	const version = buffer.readInt32LE(0);

	// Before version 28 the game version fields do not exist, but those are also the versions the
	// parser handles perfectly well, so the caller will ignore what we return here.
	return {
		version,
		gameVersionMajor: buffer.readInt32LE(12),
		gameVersionMinor: buffer.readInt32LE(16),
	};
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

main();
