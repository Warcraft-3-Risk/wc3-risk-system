import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import * as fs from 'fs-extra';
import * as path from 'path';
import { createLogger, format, transports } from 'winston';
const { combine, timestamp, printf } = format;
const luamin = require('luamin');
import 'dotenv/config';

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
	return loadJsonFile(configPath);
}

/**
 * Convert a Buffer to ArrayBuffer
 * @param buf
 */
export function toArrayBuffer(b: Buffer): ArrayBuffer {
	var ab = new ArrayBuffer(b.length);
	var view = new Uint8Array(ab);
	for (var i = 0; i < b.length; ++i) {
		view[i] = b[i];
	}
	return ab;
}

/**
 * Convert a ArrayBuffer to Buffer
 * @param ab
 */
export function toBuffer(ab: ArrayBuffer) {
	var buf = Buffer.alloc(ab.byteLength);
	var view = new Uint8Array(ab);
	for (var i = 0; i < buf.length; ++i) {
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
		let fullPath = path.join(dir, file);
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

	logger.info('Modifying tsconfig.json to work with war3-transformer...');
	updateTSConfig(config.mapFolder);

	logger.info('Transpiling TypeScript to Lua...');
	execSync('tstl -p tsconfig.json', { stdio: 'inherit' });

	if (!fs.existsSync(tsLua)) {
		logger.error(`Could not find "${tsLua}"`);
		return false;
	}

	// Merge the TSTL output with war3map.lua
	const mapLua = `./dist/${config.mapFolder}/war3map.lua`;

	if (!fs.existsSync(mapLua)) {
		logger.error(`Could not find "${mapLua}"`);
		return false;
	}

	try {
		let contents = fs.readFileSync(mapLua).toString() + fs.readFileSync(tsLua).toString();

		if (config.minifyScript) {
			logger.info(`Minifying script...`);
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
	const w3cModeEnabled = `${config.w3cModeEnabled}` == 'true';

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
