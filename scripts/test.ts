import { exec, execFile, execSync } from 'child_process';
import { loadJsonFile, loadTerrainConfig, logger, compileMap, updateTsFileWithConfig, IProjectConfig } from './utils';

function main() {
	// Get terrain from command line args (e.g., npm run test europe)
	const terrain = process.argv[2];

	if (!terrain) {
		logger.error('No terrain specified. Usage: npm run test <terrain>');
		logger.error('Example: npm run test asia');
		logger.error('Example: npm run test europe');
		logger.error('Example: npm run test europe');
		process.exit(1);
	}

	const config: IProjectConfig = loadTerrainConfig(terrain);

	// Update map-info.ts with the correct MAP_TYPE before compiling
	const restoreMapInfo = updateTsFileWithConfig(config);

	// compileMap will sync object editor files from risk_europe to dist/ automatically. It runs
	// synchronously, so map-info.ts can be put back as soon as it returns.
	let result: boolean;

	try {
		result = compileMap(config);
	} finally {
		restoreMapInfo();
	}

	if (!result) {
		logger.error(`Failed to compile map.`);
		return;
	}

	const cwd = process.cwd();
	const filename = `${cwd}/dist/${config.mapFolder}`;

	logger.info(`Launching map "${filename.replace(/\\/g, '/')}"...`);

	if (config.winePath) {
		const wineFilename = `"Z:${filename}"`;
		const prefix = config.winePrefix ? `WINEPREFIX=${config.winePrefix}` : '';
		execSync(`${prefix} ${config.winePath} "${config.gameExecutable}" ${['-loadfile', wineFilename, ...config.launchArgs].join(' ')}`, {
			stdio: 'ignore',
		});
	} else {
		execFile(config.gameExecutable, ['-loadfile', filename, ...config.launchArgs], (err: any) => {
			if (err && err.code === 'ENOENT') {
				logger.error(
					`No such file or directory "${config.gameExecutable}". Make sure your GAME_EXECUTABLE environment variable is configured properly in your local .env.`
				);
			}
		});
	}
}

main();
