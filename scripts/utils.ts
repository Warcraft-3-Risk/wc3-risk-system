import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import * as fs from 'fs-extra';
import * as path from 'path';
import { createLogger, format, transports } from 'winston';
import 'dotenv/config';

const { combine, timestamp, printf } = format;
const luamin = require('luamin');

export interface IProjectConfig {
	mapFolder: string;
	mapType: string;
	minifyScript: boolean;
	gameExecutable: string;
	outputFolder: string;
	launchArgs: string[];
	mapName: string;
	mapVersion: string;
	mapNameStringId: number;
	w3cModeEnabled: boolean;
	winePath?: string;
	winePrefix?: string;
}

/**
 * Load an object from a JSON file.
 * @param fname The JSON file
 */
export function loadJsonFile(fname: string) {
	try {
		const rawConfig = fs.readFileSync(fname).toString();
		const substitutedConfig = rawConfig.replace(/\$\{(\w+)\}/g, (_, envVar) => process.env[envVar] || '');
		return JSON.parse(substitutedConfig);
	} catch (e: any) {
		logger.error(e.toString());
		return {};
	}
}

/**
 * Load terrain-specific config from maps/risk_{terrain}.json
 * @param terrain The terrain name (e.g., 'europe', 'world')
 * @returns The project configuration
 */
export function loadTerrainConfig(terrain: string): IProjectConfig {
	const configPath = path.join('maps', `risk_${terrain}.json`);

	if (!fs.existsSync(configPath)) {
		logger.error(`Config file not found: ${configPath}`);
		logger.error(`Available terrains should have config files: maps/risk_{terrain}.json`);
		throw new Error(`Config file not found for terrain: ${terrain}`);
	}

	logger.info(`Loading config from: ${configPath}`);
	const config = loadJsonFile(configPath);
	validateConfig(config, configPath);
	return config;
}

/**
 * Required fields and their expected types for a terrain config.
 */
const REQUIRED_CONFIG_FIELDS: Record<string, string> = {
	mapFolder: 'string',
	mapType: 'string',
	mapName: 'string',
	mapVersion: 'string',
	mapNameStringId: 'number',
	minifyScript: 'boolean',
	launchArgs: 'object', // arrays are typeof 'object'
};

/**
 * Validate a terrain config against the IProjectConfig schema.
 * Logs warnings for missing or mistyped required fields.
 * @param config The loaded config object
 * @param configPath Path to the config file (for error messages)
 */
export function validateConfig(config: Record<string, unknown>, configPath: string): void {
	const errors: string[] = [];

	for (const [field, expectedType] of Object.entries(REQUIRED_CONFIG_FIELDS)) {
		if (!(field in config)) {
			errors.push(`  Missing required field: '${field}'`);
		} else if (typeof config[field] !== expectedType) {
			errors.push(`  Field '${field}' should be ${expectedType}, got ${typeof config[field]}`);
		}
	}

	if ('launchArgs' in config && !Array.isArray(config['launchArgs'])) {
		errors.push(`  Field 'launchArgs' should be an array`);
	}

	if (errors.length > 0) {
		logger.error(`Config validation errors for ${configPath}:`);
		for (const error of errors) {
			logger.error(error);
		}
		throw new Error(`Config validation failed for ${configPath}. See errors above.`);
	}
}

/**
 * Convert a Buffer to ArrayBuffer
 * @param buf
 */
export function toArrayBuffer(b: Buffer): ArrayBuffer {
	const ab = new ArrayBuffer(b.length);
	const view = new Uint8Array(ab);
	for (let i = 0; i < b.length; ++i) {
		view[i] = b[i];
	}
	return ab;
}

/**
 * Convert a ArrayBuffer to Buffer
 * @param ab
 */
export function toBuffer(ab: ArrayBuffer) {
	const buf = Buffer.alloc(ab.byteLength);
	const view = new Uint8Array(ab);
	for (let i = 0; i < buf.length; ++i) {
		buf[i] = view[i];
	}
	return buf;
}

/**
 * Recursively retrieve a list of files in a directory.
 * @param dir The path of the directory
 */
export function getFilesInDirectory(dir: string) {
	const files: string[] = [];
	fs.readdirSync(dir).forEach((file) => {
		const fullPath = path.join(dir, file);
		if (fs.lstatSync(fullPath).isDirectory()) {
			const d = getFilesInDirectory(fullPath);
			for (const n of d) {
				files.push(n);
			}
		} else {
			files.push(fullPath);
		}
	});
	return files;
}

function updateTSConfig(mapFolder: string) {
	const tsconfig = loadJsonFile('tsconfig.json');
	const plugin = tsconfig.compilerOptions.plugins[0];

	plugin.mapDir = path.relative('maps', mapFolder).replace(/\\/g, '/');
	plugin.entryFile = tsconfig.tstl.luaBundleEntry.replace(/\\/g, '/');
	plugin.outputDir = path.relative('dist', mapFolder).replace(/\\/g, '/');

	writeFileSync('tsconfig.json', JSON.stringify(tsconfig, undefined, 2));
}

/**
 * Save the original tsconfig.json content before modification.
 * Returns a restore function that writes the original content back.
 */
export function saveTSConfig(): () => void {
	const original = fs.readFileSync('tsconfig.json', 'utf8');
	return () => {
		fs.writeFileSync('tsconfig.json', original);
	};
}

/**
 *
 */
export function compileMap(config: IProjectConfig) {
	if (!config.mapFolder) {
		logger.error(`Could not find key "mapFolder" in config.json`);
		return false;
	}

	const tsLua = './dist/tstl_output.lua';
	if (fs.existsSync(tsLua)) {
		fs.unlinkSync(tsLua);
	}

	logger.info(`Building "${config.mapFolder}"...`);
	fs.copySync(`./maps/${config.mapFolder}`, `./dist/${config.mapFolder}`);

	// Copy loading screen files to root of dist folder if they exist
	copyLoadingScreenFiles(config.mapFolder);

	// Sync object editor files from risk_europe.w3x to the dist folder
	// This happens after copying the map files, so it only modifies the dist/ folder
	syncObjectEditorFiles(config.mapType, config.mapFolder);

	logger.info('Modifying tsconfig.json to work with war3-transformer...');
	const restoreTSConfig = saveTSConfig();
	updateTSConfig(config.mapFolder);

	logger.info('Transpiling TypeScript to Lua...');
	try {
		execSync('tstl -p tsconfig.json', { stdio: 'inherit' });
	} finally {
		restoreTSConfig();
		logger.info('Restored original tsconfig.json');
	}

	if (!fs.existsSync(tsLua)) {
		logger.error(`Could not find "${tsLua}"`);
		return false;
	}

	const mapLua = `./dist/${config.mapFolder}/war3map.lua`;

	if (!fs.existsSync(mapLua)) {
		logger.error(`Could not find "${mapLua}"`);
		return false;
	}

	try {
		// --- Merge everything ---
		let contents = '';

		const war3mapContents = fs.readFileSync(mapLua, 'utf8');
		const tstlOutput = fs.readFileSync(tsLua, 'utf8');

		// Inject raw Lua files from src/lua/ before the tstl bundle.
		// Must come before tstlOutput because tstl may end with a top-level
		// `return`, after which Lua rejects any further statements.
		let rawLuaInjection = '';
		const luaDir = path.join(__dirname, '..', 'src', 'lua');
		if (fs.existsSync(luaDir)) {
			const luaFiles = fs.readdirSync(luaDir).filter((f) => f.endsWith('.lua'));
			for (const luaFile of luaFiles) {
				const luaContent = fs.readFileSync(path.join(luaDir, luaFile), 'utf8');
				rawLuaInjection += luaContent + '\n';
				logger.info(`Injected raw Lua: ${luaFile}`);
			}
		}

		contents += war3mapContents + '\n' + rawLuaInjection + tstlOutput;

		// --- Optional minify ---
		if (config.minifyScript) {
			logger.info('Minifying script...');
			contents = luamin.minify(contents.toString());
		}

		fs.writeFileSync(mapLua, contents);
	} catch (err: any) {
		logger.error(err.toString());
		return false;
	}

	return true;
}

/**
 * Formatter for log messages.
 */
const loggerFormatFunc = printf(({ level, message, timestamp }) => {
	// @ts-expect-error timestamp is present but not in the type definition
	return `[${timestamp.replace('T', ' ').split('.')[0]}] ${level}: ${message}`;
});

/**
 * The logger object.
 */
export const logger = createLogger({
	transports: [
		new transports.Console({
			format: combine(format.colorize(), timestamp(), loggerFormatFunc),
		}),
		new transports.File({
			filename: 'project.log',
			format: combine(timestamp(), loggerFormatFunc),
		}),
	],
});

/**
 * Updates the map-info.ts file with values from the config
 * This injects MAP_NAME, MAP_VERSION, MAP_TYPE, and W3C_MODE_ENABLED constants
 * @param config The project configuration
 */
export function updateTsFileWithConfig(config: IProjectConfig) {
	const tsFilePath = path.join(__dirname, '..', 'src/app/utils', 'map-info.ts');
	const w3cModeEnabled = `${config.w3cModeEnabled}` === 'true';

	const fileContent = `
	//Do not edit - this will automatically update based on the project config.json upon building the map
	export const MAP_NAME: string = '${config.mapName}';
	export const MAP_VERSION: string = '${config.mapVersion}';
	export const MAP_TYPE: string = '${config.mapType}';
	export const W3C_MODE_ENABLED: boolean = ${w3cModeEnabled};
  `;

	fs.writeFileSync(tsFilePath, fileContent);
	logger.info(`Updated map-info.ts with MAP_TYPE='${config.mapType}'`);
}

/**
 * Copies loading screen files from the map source folder to the root of the dist folder
 * This ensures loading screen assets are at the correct path for WC3 to load them
 * @param mapFolder The map folder name (e.g., 'risk_world.w3x')
 */
export function copyLoadingScreenFiles(mapFolder: string) {
	const sourcePath = path.join('maps', mapFolder);
	const targetPath = path.join('dist', mapFolder);

	// Loading screen files to copy
	const loadingScreenFiles = ['Fullscreen.dds', 'LoadingScreen.mdx'];

	logger.info(`Checking for loading screen files in ${mapFolder}...`);

	let copiedCount = 0;

	for (const file of loadingScreenFiles) {
		const sourceFile = path.join(sourcePath, 'Assets', 'Loading Screen', file);
		const targetFile = path.join(targetPath, file);

		// Only copy if source file exists
		if (fs.existsSync(sourceFile)) {
			fs.copyFileSync(sourceFile, targetFile);
			copiedCount++;
			logger.info(`  ✓ Copied ${file} to root of dist folder`);
		}
	}

	if (copiedCount > 0) {
		logger.info(`Loading screen files copied: ${copiedCount} file(s)`);
	} else {
		logger.info('No loading screen files found to copy');
	}
}

/**
 * Syncs object editor files from risk_europe.w3x (master) to the target terrain in dist/
 * This ensures all terrains use the same unit/ability/buff/destructable data
 * This function should be called AFTER the map files have been copied to dist/
 * @param targetTerrain The terrain to sync to (e.g., 'world', 'asia')
 * @param mapFolder The map folder name (e.g., 'risk_world.w3x')
 */
export function syncObjectEditorFiles(targetTerrain: string, mapFolder: string) {
	// If building europe, no sync needed (it's the master)
	if (targetTerrain === 'europe') {
		logger.info('Building europe terrain (master) - skipping object editor sync');
		return;
	}

	const sourcePath = path.join('maps', 'risk_europe.w3x');
	const targetPath = path.join('dist', mapFolder);

	// Object editor files to sync
	const objectEditorFiles = [
		// Regular object modifications
		'war3map.w3u', // Units
		'war3map.w3a', // Abilities
		'war3map.w3b', // Destructables
		'war3map.w3h', // Buffs/Effects
		'war3map.wts', // Strings
		// Skin modifications
		'war3mapSkin.w3u',
		'war3mapSkin.w3a',
		'war3mapSkin.w3b',
		'war3mapSkin.w3h',
		'war3mapSkin.txt',
	];

	logger.info(`Syncing object editor files from risk_europe.w3x to dist/${mapFolder}...`);

	let syncedCount = 0;
	let skippedCount = 0;

	for (const file of objectEditorFiles) {
		const sourceFile = path.join(sourcePath, file);
		const targetFile = path.join(targetPath, file);

		// Only copy if source file exists
		if (fs.existsSync(sourceFile)) {
			fs.copyFileSync(sourceFile, targetFile);
			syncedCount++;
			logger.info(`  ✓ Synced ${file}`);
		} else {
			skippedCount++;
			logger.warn(`  ⚠ Skipped ${file} (not found in source)`);
		}
	}

	logger.info(`Object editor sync complete: ${syncedCount} files synced, ${skippedCount} files skipped`);
}
