import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import './fixtures/wc3-shim';

vi.mock('../src/app/utils/hex-colors', () => ({
	HexColors: {
		TANGERINE: '|cffffcc00', // Mock hex string
	},
}));

vi.mock('../src/app/utils/player-colors', () => ({
	PLAYER_COLORS: [],
	ACTIVE_PLAYER_COLORS: [],
}));

vi.mock('w3ts', () => ({
	File: class {},
}));

vi.mock('w3ts/system/file', () => ({
	File: class {},
}));

vi.mock('../src/app/utils/unit-types', () => ({ UNIT_TYPE: {} }));

import { CountdownState } from '../src/app/game/game-mode/base-game-mode/countdown-state';
import { GlobalGameData } from '../src/app/game/state/global-game-state';
import { PlayerManager } from '../src/app/player/player-manager';
import { SettingsContext } from '../src/app/settings/settings-context';
import { RatingManager } from '../src/app/rating/rating-manager';
import { NameManager } from '../src/app/managers/names/name-manager';
import { ActivePlayer } from '../src/app/player/types/active-player';

// Mock dependencies
vi.mock('../src/app/utils/utils', () => ({
	PlayGlobalSound: vi.fn(),
}));

vi.mock('../src/app/ui/player-preference-buttons', () => ({
	updateRatingStatsButtonForRankedStatus: vi.fn(),
}));

vi.mock('../src/app/scoreboard/scoreboard-manager', () => ({
	ScoreboardManager: {
		getInstance: vi.fn().mockReturnValue({
			updateReplayPov: vi.fn(),
		}),
	},
}));

describe('CountdownState', () => {
	let countdownState: CountdownState<any>;
	let mockPlayers: ActivePlayer[];

	beforeEach(() => {
		// Reset singletons for clean test state
		// Set up mock players
		const mockPlayer = {
			getPlayer: vi.fn(),
			ratingStatsUI: {
				preInitialize: vi.fn(),
			},
		} as unknown as ActivePlayer;
		mockPlayers = [mockPlayer];

		// Mock PlayerManager
		vi.spyOn(PlayerManager, 'getInstance').mockReturnValue({
			getInitialHumanPlayerCount: vi.fn().mockReturnValue(15),
			playersAndObservers: mockPlayers,
			getCurrentActiveHumanPlayers: vi.fn().mockReturnValue(mockPlayers),
		} as any);

		// Mock RatingManager
		vi.spyOn(RatingManager, 'getInstance').mockReturnValue({
			isRatingSystemEnabled: vi.fn().mockReturnValue(true),
			checkRankedGameEligibility: vi.fn().mockReturnValue(false), // Forced unranked by default
			generateGameId: vi.fn(),
			finalizePlayerRating: vi.fn(),
			getShowRatingPreference: vi.fn().mockReturnValue(true),
		} as any);

		// Mock NameManager
		vi.spyOn(NameManager, 'getInstance').mockReturnValue({
			getBtag: vi.fn().mockReturnValue('TestBtag#1234'),
		} as any);

		// Mock SettingsContext (needs to control isFFA)
		vi.spyOn(SettingsContext, 'getInstance').mockReturnValue({
			isFFA: vi.fn().mockReturnValue(true),
		} as any);

		// Mock GlobalGameData
		vi.spyOn(GlobalGameData, 'matchCount', 'get').mockReturnValue(1);
		vi.spyOn(GlobalGameData, 'matchPlayers', 'get').mockReturnValue([]);

		// Globals for WC3 API
		global.DisplayTimedTextToPlayer = vi.fn();
		global.CreateTimer = vi.fn().mockReturnValue('dummyTimer');
		global.TimerStart = vi.fn();
		global.BlzGetFrameByName = vi.fn().mockReturnValue('dummyFrame');
		global.BlzFrameSetVisible = vi.fn();

		countdownState = new CountdownState(5);
		countdownState.stateData = {} as any;
		countdownState.nextState = vi.fn();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should display the unranked message if it is an FFA game and match count is 1', () => {
		countdownState.onEnterState();

		const calls = (global.DisplayTimedTextToPlayer as any).mock.calls;
		const messages = calls.map((call: any[]) => call[4]);

		expect(messages.some((msg: string) => msg.includes('This is an unranked game!'))).toBe(true);
	});

	it('should NOT display the unranked message if it is NOT an FFA game', () => {
		// Change to non-FFA
		vi.spyOn(SettingsContext.getInstance(), 'isFFA').mockReturnValue(false);

		countdownState.onEnterState();

		const calls = (global.DisplayTimedTextToPlayer as any).mock.calls;
		const messages = calls.map((call: any[]) => call[4]);

		expect(messages.some((msg: string) => msg.includes('This is an unranked game!'))).toBe(false);
	});

	it('should NOT display the unranked message if matchCount > 1', () => {
		vi.spyOn(GlobalGameData, 'matchCount', 'get').mockReturnValue(2);

		countdownState.onEnterState();

		const calls = (global.DisplayTimedTextToPlayer as any).mock.calls;
		const messages = calls.map((call: any[]) => call[4]);

		expect(messages.some((msg: string) => msg.includes('This is an unranked game!'))).toBe(false);
	});
});
