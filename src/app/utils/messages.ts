import { PlayGlobalSound, PlayLocalSound } from './utils';

/**
 * Display a countdown message on the screen.
 * @param msg - The message to display.
 */
export function CountdownMessage(msg: string) {
	const frame: framehandle = BlzGetFrameByName('CountdownFrame', 0);
	BlzFrameSetText(frame, msg);
}
let activeGlobalMessage: timer | undefined = undefined;
let globalMessageQueue: { msg: string; soundPath?: string; duration: number }[] = [];

/**
 * Internal function that processes the next message in the queue.
 */
function processNextGlobalMessage() {
	if (globalMessageQueue.length === 0) {
		activeGlobalMessage = undefined;
		return;
	}

	const { msg, soundPath, duration } = globalMessageQueue.shift()!;

	const frame: framehandle = BlzGetFrameByName('GlobalMessageFrame', 0);
	BlzFrameSetText(frame, msg);

	if (soundPath) PlayGlobalSound(soundPath);

	const playerMsgTimer: timer = CreateTimer();
	activeGlobalMessage = playerMsgTimer;

	TimerStart(playerMsgTimer, duration, false, () => {
		BlzFrameSetText(frame, '');

		PauseTimer(playerMsgTimer);
		DestroyTimer(playerMsgTimer);
		activeGlobalMessage = undefined;

		// Process the next message in the queue
		processNextGlobalMessage();
	});
}

/**
 * Queue a global message to display on the screen for a specified duration.
 * Optionally plays a sound.
 * @param msg - The message to display.
 * @param soundPath - The path of the sound file to play.
 * @param duration - The duration to display the message (default is 3 seconds).
 */
export function GlobalMessage(msg: string, soundPath?: string, duration: number = 3) {
	globalMessageQueue.push({ msg, soundPath, duration });

	// If nothing is active, start processing
	if (activeGlobalMessage === undefined) {
		processNextGlobalMessage();
	}
}


/** Map to keep track of timers for error messages per player. */
const errorMap: Map<player, timer> = new Map<player, timer>();

/**
 * Display an error message to a specific player for a specified duration.
 * Plays an error sound.
 * @param player - The player to display the error message to.
 * @param msg - The message to display.
 * @param duration - The duration to display the message (default is 3 seconds).
 */

//TODO refactor this to check if there is a timer already, if there is delete it before setting new timer
export function ErrorMsg(player: player, msg: string, duration: number = 3) {
	if (errorMap.has(player)) {
		PauseTimer(errorMap.get(player));
		DestroyTimer(errorMap.get(player));
	}

	BlzFrameSetText(BlzGetFrameByName('ErrorMessageFrame', GetPlayerId(player)), msg);
	PlayLocalSound('Sound\\Interface\\Error.flac', player);

	const errorTimer: timer = CreateTimer();
	errorMap.set(player, errorTimer);

	TimerStart(errorTimer, duration, false, () => {
		BlzFrameSetText(BlzGetFrameByName('ErrorMessageFrame', GetPlayerId(player)), '');
		PauseTimer(errorTimer);
		DestroyTimer(errorTimer);
		errorMap.delete(player);
	});
}

const localMsgMap: Map<player, timer> = new Map<player, timer>();

//TODO add support for multi message display, each message should have its own duration
export function LocalMessage(player: player, msg: string, soundPath: string, duration: number = 3) {
	if (localMsgMap.has(player)) {
		PauseTimer(localMsgMap.get(player));
		DestroyTimer(localMsgMap.get(player));
		BlzFrameSetText(BlzGetFrameByName('LocalMessageFrame', GetPlayerId(player)), '');
	}

	BlzFrameSetText(BlzGetFrameByName('LocalMessageFrame', GetPlayerId(player)), msg);

	if(soundPath) {
		PlayLocalSound(soundPath, player);
	}

	const localTimer: timer = CreateTimer();
	localMsgMap.set(player, localTimer);

	TimerStart(localTimer, duration, false, () => {
		BlzFrameSetText(BlzGetFrameByName('LocalMessageFrame', GetPlayerId(player)), '');
		PauseTimer(localTimer);
		DestroyTimer(localTimer);
		localMsgMap.delete(player);
	});
}
