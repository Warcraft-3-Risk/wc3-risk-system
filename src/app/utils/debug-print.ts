import { SHOW_DEBUG_PRINTS } from 'src/configs/game-settings';
import { HexColors } from './hex-colors';
import { File } from 'w3ts/system/file';

class DebugLogger {
	private static instance: DebugLogger;
	private logs: string[] = [];
	private maxLogs: number = 1000; // Prevent memory issues
	private autoSaveTimer: timer | null = null;
	private autoSaveInterval: number = 1.0; // Save every 1 second
	private filename: string = 'debug-log.txt';

	private constructor() {}

	static getInstance(): DebugLogger {
		if (!DebugLogger.instance) {
			DebugLogger.instance = new DebugLogger();
		}
		return DebugLogger.instance;
	}

	addLog(message: string): void {
		const timestamp = `[${I2S(R2I(TimerGetElapsed(CreateTimer())))}s]`;
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
		if (this.logs.length > 0) {
			const content = this.logs.join('\n');
			File.writeRaw(this.filename, content, false);
		}
	}

	dumpToFile(filename: string = 'debug-log.txt'): void {
		this.filename = filename;
		this.writeToFile();
		print(`${HexColors.YELLOW}Debug log dumped to: ${filename}|r`);
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
		DebugLogger.getInstance().addLog(fullMessage);
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
