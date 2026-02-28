import {
	SHOW_DEBUG_PRINTS,
	CITIES_TO_WIN_RATIO,
	STARTING_INCOME,
	STARTING_COUNTDOWN,
	TURN_DURATION_IN_SECONDS,
	TICK_DURATION_IN_SECONDS,
	NOMAD_DURATION,
	OVERTIME_MODIFIER,
	CITIES_TO_WIN_WARNING_RATIO,
	CITIES_PER_PLAYER_UPPER_BOUND,
	STFU_DURATION,
	ENABLE_EXPORT_SHUFFLED_PLAYER_LIST,
	ENABLE_EXPORT_GAME_SETTINGS,
	ENABLE_EXPORT_END_GAME_SCORE,
	CAPITALS_SELECTION_PHASE,
	W3C_TERMINATE_IF_ALONE_HUMAN_PLAYER,
	SAVE_DEBUG_LOGS_TO_FILE,
} from 'src/configs/game-settings';
import { HexColors } from './hex-colors';
import { File } from 'w3ts/system/file';
import { MAP_NAME, MAP_VERSION, W3C_MODE_ENABLED } from './map-info';

class DebugLogger {
	private static instance: DebugLogger;
	private logs: string[] = [];
	private maxLogs: number = 1000; // Prevent memory issues
	private autoSaveTimer: timer | null = null;
	private autoSaveInterval: number = 1.0; // Save every 1 second
	private filename: string = ''; // Will be set on first use with player hash
	private headerAdded: boolean = false;
	private gameStartTime: number = 0; // Track game start time for timestamps
	private filenameInitialized: boolean = false;

	private constructor() {
		// Capture game start time once
		this.gameStartTime = os.time();
	}

	static getInstance(): DebugLogger {
		if (!DebugLogger.instance) {
			DebugLogger.instance = new DebugLogger();
		}
		return DebugLogger.instance;
	}

	/**
	 * Generate a short hash from player name for unique filenames
	 * Uses Lua-compatible operations
	 */
	private getPlayerHash(name: string): string {
		let hash = 5381;
		for (let i = 0; i < name.length; i++) {
			// Simple hash algorithm avoiding bitwise operations that may overflow in Lua
			hash = ((hash * 33) + name.charCodeAt(i)) % 100000000;
		}
		// Use math.abs (Lua) and string.format for hex conversion
		const absHash = math.abs(hash);
		// Convert to hex string using Lua's string.format
		return string.format('%08x', absHash);
	}

	/**
	 * Initialize the filename with player-specific hash (called on first use)
	 */
	private initializeFilename(): void {
		if (this.filenameInitialized) return;

		const localPlayer = GetLocalPlayer();
		const playerName = GetPlayerName(localPlayer);
		const playerId = GetPlayerId(localPlayer);
		const isObserver = IsPlayerObserver(localPlayer);
		const hash = this.getPlayerHash(playerName);
		const obsTag = isObserver ? '_obs' : '';

		// Format: debug-log_<hash>_p<id><obs>.txt
		// Example: debug-log_a1b2c3d4_p1_obs.txt (for observer)
		// Example: debug-log_e5f6g7h8_p0.txt (for active player)
		this.filename = `debug-log_${hash}_p${playerId}${obsTag}.txt`;
		this.filenameInitialized = true;
	}

	private addHeader(): void {
		// Initialize filename on first use
		this.initializeFilename();

		// Get local player info for header
		const localPlayer = GetLocalPlayer();
		const playerName = GetPlayerName(localPlayer);
		const playerId = GetPlayerId(localPlayer);
		const isObserver = IsPlayerObserver(localPlayer);

		// Use os.date from Lua instead of JavaScript Date
		const dateStr = os.date('%Y-%m-%d %H:%M:%S');

		this.logs.push('='.repeat(80));
		this.logs.push(`Debug Log Session`);
		this.logs.push(`Map: ${MAP_NAME} v${MAP_VERSION}`);
		this.logs.push(`Date: ${dateStr}`);
		this.logs.push(`W3C Mode: ${W3C_MODE_ENABLED}`);
		this.logs.push('-'.repeat(80));
		this.logs.push(`Local Player: ${playerName} (id=${playerId}, isObserver=${isObserver})`);
		this.logs.push(`Log File: ${this.filename}`);
		this.logs.push('-'.repeat(80));
		this.logs.push('Game Settings:');
		this.logs.push(`  CITIES_TO_WIN_RATIO: ${CITIES_TO_WIN_RATIO}`);
		this.logs.push(`  STARTING_INCOME: ${STARTING_INCOME}`);
		this.logs.push(`  STARTING_COUNTDOWN: ${STARTING_COUNTDOWN}`);
		this.logs.push(`  TURN_DURATION_IN_SECONDS: ${TURN_DURATION_IN_SECONDS}`);
		this.logs.push(`  TICK_DURATION_IN_SECONDS: ${TICK_DURATION_IN_SECONDS}`);
		this.logs.push(`  NOMAD_DURATION: ${NOMAD_DURATION}`);
		this.logs.push(`  OVERTIME_MODIFIER: ${OVERTIME_MODIFIER}`);
		this.logs.push(`  CITIES_TO_WIN_WARNING_RATIO: ${CITIES_TO_WIN_WARNING_RATIO}`);
		this.logs.push(`  CITIES_PER_PLAYER_UPPER_BOUND: ${CITIES_PER_PLAYER_UPPER_BOUND}`);
		this.logs.push(`  STFU_DURATION: ${STFU_DURATION}`);
		this.logs.push(`  CAPITALS_SELECTION_PHASE: ${CAPITALS_SELECTION_PHASE}`);
		this.logs.push(`  W3C_TERMINATE_IF_ALONE_HUMAN_PLAYER: ${W3C_TERMINATE_IF_ALONE_HUMAN_PLAYER}`);
		this.logs.push(`  ENABLE_EXPORT_SHUFFLED_PLAYER_LIST: ${ENABLE_EXPORT_SHUFFLED_PLAYER_LIST}`);
		this.logs.push(`  ENABLE_EXPORT_GAME_SETTINGS: ${ENABLE_EXPORT_GAME_SETTINGS}`);
		this.logs.push(`  ENABLE_EXPORT_END_GAME_SCORE: ${ENABLE_EXPORT_END_GAME_SCORE}`);
		this.logs.push('='.repeat(80));
		this.logs.push('');
		this.headerAdded = true;
	}

	addLog(message: string): void {
		// Add header on first log
		if (!this.headerAdded) {
			this.addHeader();
		}

		// Calculate elapsed time since game start (don't create new timer handles!)
		const elapsedSeconds = os.time() - this.gameStartTime;
		const timestamp = `[${elapsedSeconds}s]`;
		this.logs.push(`${timestamp} ${message}`);

		// Start auto-save timer on first log
		if (!this.autoSaveTimer) {
			this.startAutoSave();
		}

		// Keep only the last N logs to prevent memory issues
		if (this.logs.length > this.maxLogs) {
			this.logs.shift();
		}
	}

	private startAutoSave(): void {
		this.autoSaveTimer = CreateTimer();
		TimerStart(this.autoSaveTimer, this.autoSaveInterval, true, () => {
			this.writeToFile();
		});
	}

	private writeToFile(): void {
		// Ensure filename is initialized before writing
		this.initializeFilename();

		if (this.logs.length > 0) {
			// IMPORTANT: Wrap file I/O in GetLocalPlayer block to prevent desync
			// This ensures the file write only affects local state, not synchronized game state
			if (GetLocalPlayer() === GetLocalPlayer()) {
				const content = this.logs.join('\n');
				File.writeRaw(this.filename, content, false);
			}
		}
	}

	dumpToFile(filename?: string): void {
		if (filename) {
			this.filename = filename;
		} else {
			this.initializeFilename();
		}
		this.writeToFile();
		print(`${HexColors.YELLOW}Debug log dumped to: ${this.filename}|r`);
	}

	clear(): void {
		this.logs = [];
		this.writeToFile(); // Write empty file to clear it
	}

	stopAutoSave(): void {
		if (this.autoSaveTimer) {
			PauseTimer(this.autoSaveTimer);
			DestroyTimer(this.autoSaveTimer);
			this.autoSaveTimer = null;
		}
	}
}

export function debugPrint(message: string, ...args: any[]): void {
	if (SHOW_DEBUG_PRINTS) {
		const fullMessage = args.length > 0 ? `${message} ${args.join(' ')}` : message;
		print(`${HexColors.RED}DEBUG:|r ${fullMessage}`);

		if (SAVE_DEBUG_LOGS_TO_FILE) {
			DebugLogger.getInstance().addLog(fullMessage);
		}
	}
}

export function dumpDebugLog(filename?: string): void {
	DebugLogger.getInstance().dumpToFile(filename);
}

export function clearDebugLog(): void {
	DebugLogger.getInstance().clear();
}

export function stopDebugAutoSave(): void {
	DebugLogger.getInstance().stopAutoSave();
}
