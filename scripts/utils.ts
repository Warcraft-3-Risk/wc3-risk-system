import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import * as fs from 'fs-extra';
import * as path from 'path';
import { createLogger, format, transports } from 'winston';
const { combine, timestamp, printf } = format;
const luamin = require('luamin');
import 'dotenv/config';
import { SHOW_DEBUG_PRINTS } from '../src/configs/game-settings';

export interface IProjectConfig {
	mapFolder: string;
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

	const mapLua = `./dist/${config.mapFolder}/war3map.lua`;
	const handleRecyclerSrc = path.join(__dirname, "..", "src", "lua", "HandleRecycler.lua");
	const handleRecyclerDst = path.join(`./dist/${config.mapFolder}`, "HandleRecycler.lua");

	if (!fs.existsSync(mapLua)) {
		logger.error(`Could not find "${mapLua}"`);
		return false;
	}

	try {
		// --- Copy HandleRecycler.lua ---
		fs.copySync(handleRecyclerSrc, handleRecyclerDst);

		// --- Modify it if show_debug_prints is false ---
		if (!SHOW_DEBUG_PRINTS) {
			let handleContents = fs.readFileSync(handleRecyclerDst, "utf8");

			// Remove specific debug print lines
			handleContents = handleContents.replace(
				/print\("\|cffff0000Warning:\|r HandleRecycler: Double deletion of .*?"\)\n?/g,
				""
			);

			fs.writeFileSync(handleRecyclerDst, handleContents);
		}



		// --- Merge everything ---
		let contents = "";
		if (fs.existsSync(handleRecyclerDst)) {
			contents += fs.readFileSync(handleRecyclerDst, "utf8") + "\n";
			logger.info("Prepended HandleRecycler.lua to war3map.lua");
		}

		let war3mapContents = fs.readFileSync(mapLua, "utf8");
		const tstlOutput = fs.readFileSync(tsLua, "utf8");

		contents += war3mapContents + "\n" + tstlOutput;

		// --- Optional minify ---
		if (config.minifyScript) {
			logger.info("Minifying script...");
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
