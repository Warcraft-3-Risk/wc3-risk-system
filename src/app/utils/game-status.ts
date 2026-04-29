import { UNIT_ID } from 'src/configs/unit-id';

const GAME_STATUS_OFFLINE = 0;
const GAME_STATUS_ONLINE = 1;
const GAME_STATUS_REPLAY = 2;

let gameStatus = GAME_STATUS_ONLINE;
let detected = false;

/**
 * Detects game status (online, offline, or replay) using the TriggerHappy method.
 * Must be called once during initialization, before any gameplay logic runs.
 *
 * In online games, SelectUnit is asynchronous — IsUnitSelected returns false immediately.
 * In offline/replay, SelectUnit is synchronous — IsUnitSelected returns true immediately.
 * ReloadGameCachesFromDisk() distinguishes offline (true) from replay (false).
 */
export function detectGameStatus(): void {
	if (detected) return;
	detected = true;

	// Find a playing human player
	let firstPlayer: player = undefined;
	for (let i = 0; i < bj_MAX_PLAYERS; i++) {
		const p = Player(i);
		if (GetPlayerController(p) === MAP_CONTROL_USER && GetPlayerSlotState(p) === PLAYER_SLOT_STATE_PLAYING) {
			firstPlayer = p;
			break;
		}
	}

	if (!firstPlayer) {
		gameStatus = GAME_STATUS_ONLINE;
		return;
	}

	const u = CreateUnit(firstPlayer, UNIT_ID.RIFLEMEN, 0, 0, 0);
	SelectUnit(u, true);
	const selected = IsUnitSelected(u, firstPlayer);
	RemoveUnit(u);

	if (selected) {
		if (ReloadGameCachesFromDisk()) {
			gameStatus = GAME_STATUS_OFFLINE;
		} else {
			gameStatus = GAME_STATUS_REPLAY;
		}
	} else {
		gameStatus = GAME_STATUS_ONLINE;
	}

	// Always create the leaderboard to keep handle IDs in sync between live and replay.
	// Only used for replay POV detection, but must exist in both contexts.
	replayLeaderboard = CreateLeaderboard();
	LeaderboardDisplay(replayLeaderboard, false);
}

export function isReplay(): boolean {
	return gameStatus === GAME_STATUS_REPLAY;
}

export function isOffline(): boolean {
	return gameStatus === GAME_STATUS_OFFLINE;
}

export function isOnline(): boolean {
	return gameStatus === GAME_STATUS_ONLINE;
}

// --- Replay POV Detection ---
// Uses the PlayerSetLeaderboard / IsLeaderboardDisplayed exploit:
// IsLeaderboardDisplayed resolves against the currently observed replay POV player,
// not the recording player. See docs/shared-slots/replay-pov-detection.md for details.

let replayLeaderboard: leaderboard | undefined = undefined;

/**
 * Returns the player whose POV is currently selected in replay mode.
 * Falls back to GetLocalPlayer() if not in a replay or if detection fails.
 */
export function getReplayObservedPlayer(): player {
	if (!replayLeaderboard) return GetLocalPlayer();

	LeaderboardDisplay(replayLeaderboard, false);
	for (let i = 0; i < bj_MAX_PLAYER_SLOTS; i++) {
		const p = Player(i);
		PlayerSetLeaderboard(p, replayLeaderboard);
		if (IsLeaderboardDisplayed(replayLeaderboard)) {
			LeaderboardDisplay(replayLeaderboard, false);
			return p;
		}
	}
	LeaderboardDisplay(replayLeaderboard, false);
	return GetLocalPlayer();
}
