/**
 * Adapter interfaces for WC3 engine APIs.
 *
 * These interfaces abstract away direct calls to WC3 engine globals,
 * enabling unit testing with mock implementations. Production code can
 * use the real WC3 adapters, while tests substitute lightweight mocks.
 */

/**
 * Adapter for WC3 player-related API calls.
 */
export interface IPlayerAdapter {
	getPlayerName(whichPlayer: player): string;
	getPlayerId(whichPlayer: player): number;
	getPlayerController(whichPlayer: player): mapcontrol;
	getPlayerSlotState(whichPlayer: player): playerslotstate;
	isPlayerObserver(whichPlayer: player): boolean;
	getPlayerState(whichPlayer: player, state: playerstate): number;
	setPlayerState(whichPlayer: player, state: playerstate, value: number): void;
}

/**
 * Adapter for WC3 timer-related API calls.
 */
export interface ITimerAdapter {
	createTimer(): timer;
	timerStart(whichTimer: timer, timeout: number, periodic: boolean, handlerFunc: () => void): void;
	destroyTimer(whichTimer: timer): void;
	pauseTimer(whichTimer: timer): void;
}

/**
 * Adapter for WC3 UI (BlzFrame) API calls.
 */
export interface IUIAdapter {
	frameSetVisible(frame: framehandle, visible: boolean): void;
	frameSetText(frame: framehandle, text: string): void;
	frameGetText(frame: framehandle): string;
	getFrameByName(name: string, createContext: number): framehandle;
}

/**
 * Adapter for file I/O operations.
 */
export interface IFileAdapter {
	read(path: string): string;
	write(path: string, content: string): boolean;
}
