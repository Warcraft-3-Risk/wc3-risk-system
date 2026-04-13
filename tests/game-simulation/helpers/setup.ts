/**
 * Common test helpers for game-simulation integration tests.
 *
 * Provides factory functions for creating test players, teams, and
 * resetting all singletons between tests.
 */
import { GlobalGameData } from 'src/app/game/state/global-game-state';
import { VictoryManager } from 'src/app/managers/victory-manager';
import { SettingsContext } from 'src/app/settings/settings-context';
import { TeamManager } from 'src/app/teams/team-manager';
import { EventEmitter } from 'src/app/utils/events/event-emitter';
import { PlayerManager } from 'src/app/player/player-manager';
import type { FakePlayerHandle } from '../../fixtures/fake-player';

// ─── Singleton Reset ────────────────────────────────────────────────

/**
 * Reset all game singletons to their default state.
 * Call this in beforeEach() to ensure test isolation.
 */
export function resetAllSingletons(): void {
	GlobalGameData.resetInstance();
	VictoryManager.resetInstance();
	SettingsContext.resetInstance();
	TeamManager.resetInstance();
	EventEmitter.resetInstance();
}

/**
 * Configure SettingsContext with specific settings for a test scenario.
 */
export function configureSettings(options: {
	fog?: number; // 0=off, 1=on, 2=nightFog
	diplomacy?: number; // 0=FFA, 1=lobbyTeams, 2=lobbyTeamsShared, 3=randomTeams, 4=randomTeamsShared
	promode?: number; // 0=off, 1=promode, 2=equalized, 3=chaos
	gameType?: number; // 0=standard, 1=capitals
	overtime?: number; // 0=off
}): void {
	SettingsContext.resetInstance();
	const ctx = SettingsContext.getInstance();
	const settings = ctx.getSettings();
	if (options.fog !== undefined) settings.Fog = options.fog;
	if (options.diplomacy !== undefined) settings.Diplomacy = { ...settings.Diplomacy, option: options.diplomacy };
	if (options.promode !== undefined) settings.Promode = options.promode;
	if (options.gameType !== undefined) settings.GameType = options.gameType;
	if (options.overtime !== undefined) settings.Overtime = { ...settings.Overtime, option: options.overtime };
}

/**
 * Create a minimal fake ActivePlayer for integration tests.
 * Uses the actual HumanPlayer class with a fake player handle.
 */
export function createFakeActivePlayer(playerId: number): any {
	const handle = Player(playerId) as unknown as FakePlayerHandle;
	handle.slotState = 'playing';
	handle.controller = 'user';

	// We create a minimal object that matches the ActivePlayer interface
	// without importing HumanPlayer (which has deep WC3 deps in constructor)
	const trackedData = {
		income: { income: 0, max: 0, end: 0, delta: 0 },
		gold: { earned: 0, max: 0, end: 0 },
		cities: { cities: [] as any[], max: 0, end: 0 },
		countries: new Map(),
		killsDeaths: new Map(),
		denies: 0,
		roarCasts: 0,
		dispelCasts: 0,
		units: new Set(),
		trainedUnits: new Map(),
		turnDied: -1,
		lastUnitKilledBy: undefined,
		lastCombat: 0,
		bounty: { reset: () => {}, add: (_v: number) => 0, earned: 0 },
		bonus: { reset: () => {}, add: (_v: number) => 0, hideUI: () => {} },
		reset() {
			this.income = { income: 0, max: 0, end: 0, delta: 0 };
			this.gold = { earned: 0, max: 0, end: 0 };
			this.cities = { cities: [], max: 0, end: 0 };
			this.countries.clear();
			this.killsDeaths.clear();
			this.units.clear();
		},
		setKDMaps() {},
	};

	const statusObj = {
		_status: '|cFF00FF00Alive|r', // PLAYER_STATUS.ALIVE
		status: '|cFF00FF00Alive|r',
		statusDuration: -1,
		isActive() {
			return this._status === '|cFF00FF00Alive|r' || this._status === '|cFFFE8A0ENmd|r';
		},
		isEliminated() {
			return this._status === '|cFFFF0005Dead|r' || this._status === '|cFF65656ALeft|r' || this._status === '|cfffe890dSTFU|r';
		},
		isAlive() {
			return this._status === '|cFF00FF00Alive|r';
		},
		isDead() {
			return this._status === '|cFFFF0005Dead|r';
		},
		isLeft() {
			return this._status === '|cFF65656ALeft|r';
		},
		isNomad() {
			return this._status === '|cFFFE8A0ENmd|r';
		},
		isSTFU() {
			return this._status === '|cfffe890dSTFU|r';
		},
		set(newStatus: string) {
			this._status = newStatus;
			this.status = newStatus;
		},
	};

	return {
		getPlayer: () => handle as unknown as player,
		trackedData,
		status: statusObj,
		options: { health: false, value: false, ping: false, board: 0, labels: true },
		killedBy: undefined,
		ratingStatsUI: undefined,
		isAdmin: () => false,
		giveGold: (_val?: number) => {},
		setEndData: () => {},
		reset() {
			trackedData.reset();
			statusObj.set('|cFF00FF00Alive|r');
		},
		onKill: () => {},
		onDeath: () => {},
	};
}

/**
 * Set up PlayerManager with specific fake players.
 * Directly injects players into the singleton's internal map.
 */
export function setupPlayerManager(players: any[]): void {
	PlayerManager.resetInstance();

	// Create a minimal PlayerManager-like object
	const playerMap = new Map<any, any>();
	players.forEach((p) => {
		playerMap.set(p.getPlayer(), p);
	});

	const alivePlayers = () => new Map(Array.from(playerMap).filter(([_, v]) => v.status.isActive()));

	// Override the singleton with our mock
	const mockInstance = {
		players: playerMap,
		activePlayers: playerMap,
		get activePlayersThatAreAlive() {
			return alivePlayers();
		},
		get activePlayersThatHaveNotLeft() {
			return new Map(Array.from(playerMap).filter(([_, v]) => !v.status.isLeft()));
		},
		observers: new Map(),
		playersAndObservers: playerMap,
		getHumanPlayers: () => Array.from(playerMap.values()),
		getHumanPlayersOnly: () => Array.from(playerMap.values()),
		getHumanPlayersCount: () => playerMap.size,
		getInitialHumanPlayerCount: () => playerMap.size,
		captureInitialHumanPlayerCount: () => {},
		isActive: (p: any) => playerMap.has(p),
		isObserver: () => false,
		setPlayerStatus: (p: any, status: string) => {
			const ap = playerMap.get(p);
			if (ap) ap.status.set(status);
		},
		getPlayerStatus: (p: any) => playerMap.get(p)?.status,
		getHost: () => players[0],
		getEmptyPlayerSlots: () => [],
		getPlayersThatLeftWithNoUnitsOrCities: () => [],
		playerControllers: new Map(),
		getCurrentActiveHumanPlayers: () => Array.from(playerMap.values()),
	};

	// Inject mock instance via the private static field
	(PlayerManager as any)._instance = mockInstance;
}

/**
 * Set up TeamManager with specific teams.
 */
export function setupTeams(teamArrays: any[][]): void {
	TeamManager.resetInstance();

	// Use createWithPresetTeams which is the production method for this
	TeamManager.createWithPresetTeams(teamArrays);

	// Sync team city counts from player trackedData
	// In production, these are updated incrementally via updateCityCount(),
	// but for tests we set them from the player's initial city arrays.
	syncTeamCityCounts(teamArrays);
}

/**
 * Re-sync team city counts from player trackedData.
 * Call this after modifying player cities to keep teams in sync.
 */
export function syncTeamCityCounts(teamArrays: any[][]): void {
	const tm = TeamManager.getInstance();
	for (const teamArr of teamArrays) {
		if (teamArr.length > 0) {
			const team = tm.getTeamFromPlayer(teamArr[0].getPlayer());
			if (team) {
				const totalCities = teamArr.reduce((sum: number, p: any) => sum + p.trackedData.cities.cities.length, 0);
				team.updateCityCount(totalCities - team.getCities());
			}
		}
	}
}
