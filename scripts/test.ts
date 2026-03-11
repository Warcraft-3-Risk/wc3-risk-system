import { exec, execFile, execSync } from 'child_process';
import * as fs from 'fs-extra';
import { loadJsonFile, loadTerrainConfig, logger, compileMap, updateTsFileWithConfig, IProjectConfig } from './utils';

/**
 * Patches war3map.lua in dist/ to set up a 2v2 team game:
 * - Player 0 (human) + Player 1 (CPU) on team 0
 * - Player 2 (CPU) + Player 3 (CPU) on team 1
 * - All other players remain user-controlled on team 0 (unused slots)
 */
function patchTeamGame(config: IProjectConfig) {
	const mapLua = `./dist/${config.mapFolder}/war3map.lua`;
	let contents = fs.readFileSync(mapLua, 'utf8');

	// Patch InitCustomPlayerSlots: set players 1-3 as CPU
	contents = contents.replace(
		/SetPlayerController\(Player\(1\), MAP_CONTROL_USER\)/,
		'SetPlayerController(Player(1), MAP_CONTROL_COMPUTER)'
	);
	contents = contents.replace(
		/SetPlayerController\(Player\(2\), MAP_CONTROL_USER\)/,
		'SetPlayerController(Player(2), MAP_CONTROL_COMPUTER)'
	);
	contents = contents.replace(
		/SetPlayerController\(Player\(3\), MAP_CONTROL_USER\)/,
		'SetPlayerController(Player(3), MAP_CONTROL_COMPUTER)'
	);

	// Patch SetPlayerSlotAvailable: mark players 1-3 as CPU slots
	contents = contents.replace(
		/SetPlayerSlotAvailable\(Player\(1\), MAP_CONTROL_USER\)/,
		'SetPlayerSlotAvailable(Player(1), MAP_CONTROL_COMPUTER)'
	);
	contents = contents.replace(
		/SetPlayerSlotAvailable\(Player\(2\), MAP_CONTROL_USER\)/,
		'SetPlayerSlotAvailable(Player(2), MAP_CONTROL_COMPUTER)'
	);
	contents = contents.replace(
		/SetPlayerSlotAvailable\(Player\(3\), MAP_CONTROL_USER\)/,
		'SetPlayerSlotAvailable(Player(3), MAP_CONTROL_COMPUTER)'
	);

	// Patch InitCustomTeams: put players 2-3 on team 1
	contents = contents.replace(
		/SetPlayerTeam\(Player\(2\), 0\)/,
		'SetPlayerTeam(Player(2), 1)'
	);
	contents = contents.replace(
		/SetPlayerTeam\(Player\(3\), 0\)/,
		'SetPlayerTeam(Player(3), 1)'
	);

	fs.writeFileSync(mapLua, contents, 'utf8');
	logger.info('Patched war3map.lua for 2v2 team game (P0+P1 vs P2+P3)');
}

function main() {
	// Get terrain from command line args (e.g., npm run test world)
	// Optional second arg: "tg" for team game mode (e.g., npm run test europe tg)
	const terrain = process.argv[2];
	const mode = process.argv[3];

	if (!terrain) {
		logger.error('No terrain specified. Usage: npm run test <terrain> [tg]');
		logger.error('Example: npm run test asia');
		logger.error('Example: npm run test europe');
		logger.error('Example: npm run test europe tg  (2v2 team game)');
		logger.error('Example: npm run test world');
		process.exit(1);
	}

	const config: IProjectConfig = loadTerrainConfig(terrain);

	// Update map-info.ts with the correct MAP_TYPE before compiling
	updateTsFileWithConfig(config);

	// compileMap will sync object editor files from risk_europe to dist/ automatically
	const result = compileMap(config);

	// Apply team game patch if "tg" mode requested
	if (mode === 'tg') {
		patchTeamGame(config);
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
