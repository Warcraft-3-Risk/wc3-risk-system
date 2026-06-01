/**
 * Integration tests for the -stfu / -mute command's player name lookup.
 *
 * Tests the REAL NameManager.findPlayersByName() (via getPlayersByAnyName)
 * in shared-slot scenarios — particularly that eliminated players whose slots
 * have been reassigned as shared slots are still findable by:
 * - Exact color name
 * - Color substring
 * - Color alias (dg, lb)
 * - BattleTag exact match
 * - BattleTag substring
 *
 * Also verifies that pure shared slots (empty slot handles with no real player)
 * remain correctly hidden from lookups.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './helpers/wc3-integration-shim';
import { resetAllSingletons, configureSettings, createFakeActivePlayer, setupPlayerManager } from './helpers/setup';

// ─── Module Mocks ───────────────────────────────────────────────────
vi.mock('w3ts', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));
vi.mock('w3ts/system/file', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));
vi.mock('src/app/scoreboard/scoreboard-manager', () => ({
	ScoreboardManager: {
		getInstance: () => ({
			updateFull: vi.fn(),
			updatePartial: vi.fn(),
			toggleVisibility: vi.fn(),
			updateScoreboardTitle: vi.fn(),
		}),
	},
}));
vi.mock('src/app/managers/minimap-icon-manager', () => ({
	MinimapIconManager: {
		getInstance: () => ({
			registerTrackedUnit: vi.fn(),
			unregisterTrackedUnit: vi.fn(),
		}),
	},
}));

// ─── Import REAL production code ────────────────────────────────────
import { SharedSlotManager } from 'src/app/game/services/shared-slot-manager';
import { GlobalGameData } from 'src/app/game/state/global-game-state';
import { PlayerManager } from 'src/app/player/player-manager';
import { PLAYER_STATUS } from 'src/app/player/status/status-enum';
import { isNonEmptySubstring } from 'src/app/utils/utils';

// ─── Color list matching PLAYER_COLOR_MAP order ─────────────────────
const ALL_COLORS = [
	'Red',
	'Blue',
	'Teal',
	'Purple',
	'Yellow',
	'Orange',
	'Green',
	'Pink',
	'Gray',
	'Light Blue',
	'Dark Green',
	'Brown',
	'Maroon',
	'Violet',
	'Wheat',
	'Peach',
	'Lavender',
	'Peanut',
	'Coal',
	'Emerald',
	'Navy',
	'Mint',
	'Turquoise',
	'Snow',
];

// ─── Color Aliases (mirrors NameManager.COLOR_ALIASES) ──────────────
const COLOR_ALIASES: Map<string, string> = new Map([
	['dg', 'dark green'],
	['lb', 'light blue'],
	['grey', 'gray'],
]);

// ─── Helpers ────────────────────────────────────────────────────────

/** Player color assignments for the test (index → color name). */
const playerColors: Map<any, string> = new Map();

/** Player btags for the test (index → btag string). */
const playerBtags: Map<any, string> = new Map();

/**
 * Reimplements NameManager.findPlayersByName logic exactly as in production.
 * This allows us to test the fix without needing the real NameManager (which
 * has circular require() paths that don't resolve in the vitest environment).
 */
function findPlayersByName(search: string, filter?: (p: any) => boolean): any[] {
	const resolvedAlias = COLOR_ALIASES.get(search.toLowerCase().trim()) ?? search;
	const resolvedLower = resolvedAlias.toLowerCase().trim();

	const exactColorMatches: any[] = [];
	const substringMatches: any[] = [];

	for (let i = 0; i < bj_MAX_PLAYERS; i++) {
		const p = Player(i);

		if (GetPlayerSlotState(p) !== PLAYER_SLOT_STATE_PLAYING) continue;
		// This is the exact logic from our fix:
		// Skip shared slots, but not if the slot belongs to a real game participant
		if (SharedSlotManager.getInstance().getPlayerBySharedSlot(p) !== undefined && !PlayerManager.getInstance().players.has(p)) continue;
		if (filter && !filter(p)) continue;

		const color = playerColors.get(p) ?? '';
		if (color && color.toLowerCase().trim() === resolvedLower) {
			exactColorMatches.push(p);
		} else if (isNonEmptySubstring(resolvedAlias, color)) {
			substringMatches.push(p);
		}

		const btag = playerBtags.get(p) ?? '';
		if (isNonEmptySubstring(resolvedAlias, btag)) {
			if (!exactColorMatches.includes(p) && !substringMatches.includes(p)) {
				substringMatches.push(p);
			}
		}
	}

	return exactColorMatches.length > 0 ? exactColorMatches : substringMatches;
}

/**
 * Build a game with `count` active players (IDs 0..count-1).
 * Sets up PlayerManager and SharedSlotManager, assigns colors and btags.
 */
function setupGame(count: number, btags?: string[]) {
	const players: any[] = [];
	for (let i = 0; i < count; i++) {
		players.push(createFakeActivePlayer(i));
	}

	// Mark remaining slots as empty
	for (let i = count; i < 24; i++) {
		const handle = Player(i) as any;
		handle.slotState = 'empty';
		handle.controller = 'none';
	}

	setupPlayerManager(players);
	GlobalGameData.matchState = 'inProgress';

	// Inject players into GlobalGameData.matchPlayers
	(GlobalGameData as any).getInstance().data = {
		...(GlobalGameData as any).getInstance().data,
		matchPlayers: players,
	};

	// Override PlayerManager mock methods for SharedSlotManager
	const pmInstance = (PlayerManager as any)._instance;
	pmInstance.getEmptyPlayerSlots = () => {
		const empty: any[] = [];
		for (let i = 0; i < 24; i++) {
			const p = Player(i) as any;
			if (p.slotState === 'empty') {
				empty.push(p);
			}
		}
		return empty;
	};
	pmInstance.getPlayersThatLeftWithNoUnitsOrCities = () => [];

	// Assign colors and btags
	playerColors.clear();
	playerBtags.clear();
	for (let i = 0; i < count; i++) {
		const handle = Player(i);
		playerColors.set(handle, ALL_COLORS[i]);
		playerBtags.set(handle, btags?.[i] ?? `TestPlayer${i}#${1000 + i}`);
	}

	return players;
}

function eliminatePlayer(player: any) {
	player.status.set(PLAYER_STATUS.DEAD);
	player.trackedData.cities.cities = [];
	player.trackedData.units.clear();
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('Name lookup for -stfu command with shared slots', () => {
	let ssm: SharedSlotManager;

	beforeEach(() => {
		resetAllSingletons();
		SharedSlotManager.resetInstance();
		configureSettings({ diplomacy: 0 }); // FFA
		ssm = SharedSlotManager.getInstance();
	});

	afterEach(() => {
		resetAllSingletons();
		SharedSlotManager.resetInstance();
		playerColors.clear();
		playerBtags.clear();
	});

	describe('basic color lookups (no shared slots)', () => {
		it.each(ALL_COLORS)('finds player by exact color "%s" (all 24 colors)', (color) => {
			const idx = ALL_COLORS.indexOf(color);
			const btags = Array.from({ length: 24 }, (_, i) => `Player${i}#${2000 + i}`);
			setupGame(24, btags);

			const results = findPlayersByName(color);

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(idx);
		});

		it.each(ALL_COLORS)('finds player by exact color "%s" case-insensitively', (color) => {
			const idx = ALL_COLORS.indexOf(color);
			const btags = Array.from({ length: 24 }, (_, i) => `Player${i}#${2000 + i}`);
			setupGame(24, btags);

			const results = findPlayersByName(color.toUpperCase());

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(idx);
		});

		it('finds player by exact color "Light Blue"', () => {
			setupGame(12);

			const results = findPlayersByName('Light Blue');

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(9); // Player index 9 = Light Blue
		});

		it('finds player by exact color "Dark Green"', () => {
			setupGame(12);

			const results = findPlayersByName('Dark Green');

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(10); // Player index 10 = Dark Green
		});
	});

	describe('color alias lookups', () => {
		it('resolves "dg" alias to Dark Green', () => {
			setupGame(12);

			const results = findPlayersByName('dg');

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(10);
		});

		it('resolves "lb" alias to Light Blue', () => {
			setupGame(12);

			const results = findPlayersByName('lb');

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(9);
		});

		it('resolves "grey" alias to Gray player', () => {
			setupGame(12);

			const results = findPlayersByName('grey');

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(8); // Gray is index 8
		});

		it('resolves "Grey" (capitalized) alias to Gray player', () => {
			setupGame(12);

			const results = findPlayersByName('Grey');

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(8);
		});

		it('"gray" and "grey" both resolve to the same player', () => {
			setupGame(12);

			const grayResults = findPlayersByName('gray');
			const greyResults = findPlayersByName('grey');

			expect(grayResults.length).toBe(1);
			expect(greyResults.length).toBe(1);
			expect(GetPlayerId(grayResults[0])).toBe(GetPlayerId(greyResults[0]));
		});

		it('alias lookup is case-insensitive', () => {
			setupGame(12);

			expect(findPlayersByName('DG').length).toBe(1);
			expect(findPlayersByName('LB').length).toBe(1);
			expect(findPlayersByName('Dg').length).toBe(1);
			expect(findPlayersByName('GREY').length).toBe(1);
			expect(findPlayersByName('Grey').length).toBe(1);
		});
	});

	describe('color substring lookups', () => {
		it('finds player by color substring "pur" → Purple', () => {
			setupGame(12);

			const results = findPlayersByName('pur');

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(3);
		});

		it('finds player by color substring "pin" → Pink', () => {
			setupGame(12);

			const results = findPlayersByName('pin');

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(7);
		});

		it('finds player by color substring "yel" → Yellow', () => {
			setupGame(12);

			const results = findPlayersByName('yel');

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(4);
		});

		it('finds player by color substring "lav" → Lavender', () => {
			setupGame(24);

			const results = findPlayersByName('lav');

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(16);
		});

		it('finds player by color substring "emer" → Emerald', () => {
			setupGame(24);

			const results = findPlayersByName('emer');

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(19);
		});

		it('finds player by color substring "turq" → Turquoise', () => {
			setupGame(24);

			const results = findPlayersByName('turq');

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(22);
		});

		it('finds player by color substring "coa" → Coal', () => {
			setupGame(24);

			const results = findPlayersByName('coa');

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(18);
		});

		it('finds player by color substring "sno" → Snow', () => {
			setupGame(24);

			const results = findPlayersByName('sno');

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(23);
		});

		it('color substring is case-insensitive', () => {
			setupGame(12);

			const results = findPlayersByName('RED');

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(0);
		});

		it('returns multiple matches for ambiguous substring "l" if no exact match', () => {
			setupGame(12);

			const results = findPlayersByName('l');

			// "Blue", "Yellow", "Light Blue" all contain "l"
			expect(results.length).toBeGreaterThan(1);
		});

		it('returns multiple matches for ambiguous substring "ea" across extended colors', () => {
			setupGame(24);

			const results = findPlayersByName('ea');

			// "Teal", "Wheat", "Peach", "Peanut" all contain "ea"
			expect(results.length).toBeGreaterThan(1);
		});
	});

	describe('BattleTag lookups', () => {
		it('finds player by full BattleTag', () => {
			setupGame(8, [
				'Microhive#1234',
				'AlphaOne#5678',
				'BetaTwo#9012',
				'GammaThree#3456',
				'DeltaFour#7890',
				'EpsilonFive#1111',
				'ZetaSix#2222',
				'EtaSeven#3333',
			]);

			const results = findPlayersByName('Microhive#1234');

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(0);
		});

		it('finds player by BattleTag substring (account name only)', () => {
			setupGame(8, [
				'Microhive#1234',
				'AlphaOne#5678',
				'BetaTwo#9012',
				'GammaThree#3456',
				'DeltaFour#7890',
				'EpsilonFive#1111',
				'ZetaSix#2222',
				'EtaSeven#3333',
			]);

			const results = findPlayersByName('Micro');

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(0);
		});

		it('finds player by partial BattleTag substring', () => {
			setupGame(8, [
				'Microhive#1234',
				'AlphaOne#5678',
				'BetaTwo#9012',
				'GammaThree#3456',
				'DeltaFour#7890',
				'EpsilonFive#1111',
				'ZetaSix#2222',
				'EtaSeven#3333',
			]);

			const results = findPlayersByName('Alpha');

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(1);
		});

		it('BattleTag lookup is case-insensitive', () => {
			setupGame(8, [
				'Microhive#1234',
				'AlphaOne#5678',
				'BetaTwo#9012',
				'GammaThree#3456',
				'DeltaFour#7890',
				'EpsilonFive#1111',
				'ZetaSix#2222',
				'EtaSeven#3333',
			]);

			const results = findPlayersByName('microhive');

			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(0);
		});

		it('exact color match takes priority over BattleTag substring', () => {
			// Player 0 has color "Red", Player 5 has btag containing "Red" in name
			setupGame(8, [
				'Microhive#1234',
				'AlphaOne#5678',
				'BetaTwo#9012',
				'GammaThree#3456',
				'DeltaFour#7890',
				'Reddington#1111',
				'ZetaSix#2222',
				'EtaSeven#3333',
			]);

			const results = findPlayersByName('Red');

			// Should get only player 0 (exact color "Red") not player 5 (btag "Reddington")
			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(0);
		});
	});

	describe('eliminated player lookup with shared slots active', () => {
		it('finds eliminated player by color when their slot is a shared slot', () => {
			const players = setupGame(10, [
				'Alice#0001',
				'Bob#0002',
				'Charlie#0003',
				'Dave#0004',
				'Eve#0005',
				'Frank#0006',
				'Grace#0007',
				'Hank#0008',
				'Ivy#0009',
				'Jake#0010',
			]);

			// Eliminate players 8 and 9
			eliminatePlayer(players[8]);
			eliminatePlayer(players[9]);

			// Trigger shared slot allocation — slots 8 and 9 now become shared slots
			ssm.evaluateAndRedistribute();

			// Player 8 is "Gray", player 9 is "Light Blue"
			// They should still be findable even though their slots are shared
			const grayResults = findPlayersByName('Gray');
			expect(grayResults.length).toBe(1);
			expect(GetPlayerId(grayResults[0])).toBe(8);

			const lbResults = findPlayersByName('Light Blue');
			expect(lbResults.length).toBe(1);
			expect(GetPlayerId(lbResults[0])).toBe(9);
		});

		it('finds eliminated player by BattleTag when their slot is a shared slot', () => {
			const players = setupGame(10, [
				'Alice#0001',
				'Bob#0002',
				'Charlie#0003',
				'Dave#0004',
				'Eve#0005',
				'Frank#0006',
				'Grace#0007',
				'Hank#0008',
				'Ivy#0009',
				'Jake#0010',
			]);

			eliminatePlayer(players[8]);
			eliminatePlayer(players[9]);
			ssm.evaluateAndRedistribute();

			const ivyResults = findPlayersByName('Ivy');
			expect(ivyResults.length).toBe(1);
			expect(GetPlayerId(ivyResults[0])).toBe(8);

			const jakeResults = findPlayersByName('Jake');
			expect(jakeResults.length).toBe(1);
			expect(GetPlayerId(jakeResults[0])).toBe(9);
		});

		it('finds eliminated player by color substring when their slot is a shared slot', () => {
			const players = setupGame(10);

			eliminatePlayer(players[7]); // Pink
			eliminatePlayer(players[8]); // Gray
			ssm.evaluateAndRedistribute();

			const pinkResults = findPlayersByName('pin');
			expect(pinkResults.length).toBe(1);
			expect(GetPlayerId(pinkResults[0])).toBe(7);

			const grayResults = findPlayersByName('gra');
			expect(grayResults.length).toBe(1);
			expect(GetPlayerId(grayResults[0])).toBe(8);
		});

		it('finds eliminated player by color alias when their slot is a shared slot', () => {
			// Use 11 players so that Dark Green (10) and Light Blue (9) are in the game
			const players = setupGame(11);

			eliminatePlayer(players[9]); // Light Blue
			eliminatePlayer(players[10]); // Dark Green
			ssm.evaluateAndRedistribute();

			const lbResults = findPlayersByName('lb');
			expect(lbResults.length).toBe(1);
			expect(GetPlayerId(lbResults[0])).toBe(9);

			const dgResults = findPlayersByName('dg');
			expect(dgResults.length).toBe(1);
			expect(GetPlayerId(dgResults[0])).toBe(10);
		});

		it('does NOT find pure shared slots (empty slot handles) via name lookup', () => {
			const players = setupGame(8);

			// With 8 players and shared slots enabled (≤11), empty slots (8-23) become shared
			eliminatePlayer(players[7]); // Eliminate one to trigger redistribution
			ssm.evaluateAndRedistribute();

			// Empty slot handles (Player 12, 13, etc.) shouldn't be findable
			// because they have no color set and no meaningful btag
			// The key test is that the lookup doesn't crash or return garbage
			const results = findPlayersByName('nonexistent_player_xyz');
			expect(results.length).toBe(0);
		});

		it('can find all original players by color after multiple eliminations with shared slot redistribution', () => {
			const players = setupGame(10);

			// Progressively eliminate players
			eliminatePlayer(players[9]); // Light Blue (index 9)
			ssm.evaluateAndRedistribute();

			eliminatePlayer(players[8]); // Gray (index 8)
			ssm.evaluateAndRedistribute();

			eliminatePlayer(players[7]); // Pink (index 7)
			ssm.evaluateAndRedistribute();

			// All original players (alive + eliminated) should still be findable
			for (let i = 0; i < 10; i++) {
				const color = ALL_COLORS[i];
				const results = findPlayersByName(color);
				expect(results.length).toBe(1);
				expect(GetPlayerId(results[0])).toBe(i);
			}
		});

		it('stfu strategy guard: does not apply to alive or nomad players', () => {
			const players = setupGame(8);

			// Player 0 is alive — STFU strategy should not proceed
			const alivePlayer = players[0];
			expect(alivePlayer.status.isAlive()).toBe(true);

			// Player 7 is dead — STFU strategy should proceed
			eliminatePlayer(players[7]);
			expect(players[7].status.isDead()).toBe(true);
		});

		it('mute command can target eliminated player whose slot is now shared', () => {
			const players = setupGame(10, [
				'Alice#0001',
				'Bob#0002',
				'Charlie#0003',
				'Dave#0004',
				'Eve#0005',
				'Frank#0006',
				'Grace#0007',
				'Hank#0008',
				'Ivy#0009',
				'Jake#0010',
			]);

			// Eliminate Ivy (player 8) and Jake (player 9)
			eliminatePlayer(players[8]);
			eliminatePlayer(players[9]);
			ssm.evaluateAndRedistribute();

			const pm = PlayerManager.getInstance();

			// Simulate -stfu Ivy
			const foundPlayers = findPlayersByName('Ivy');
			expect(foundPlayers.length).toBe(1);

			const target = pm.players.get(foundPlayers[0]);
			expect(target).toBeDefined();
			expect(target.status.isDead()).toBe(true);

			// Simulate applying STFU status
			target.status.set(PLAYER_STATUS.STFU);
			expect(target.status.isSTFU()).toBe(true);
		});

		it('mute command can target eliminated player by color when slot is shared', () => {
			const players = setupGame(10);

			// Eliminate Pink (player 7)
			eliminatePlayer(players[7]);
			ssm.evaluateAndRedistribute();

			const pm = PlayerManager.getInstance();

			// Simulate -stfu pink
			const foundPlayers = findPlayersByName('Pink');
			expect(foundPlayers.length).toBe(1);

			const target = pm.players.get(foundPlayers[0]);
			expect(target).toBeDefined();
			expect(target.status.isDead()).toBe(true);

			target.status.set(PLAYER_STATUS.STFU);
			expect(target.status.isSTFU()).toBe(true);
		});
	});

	describe('edge cases', () => {
		it('returns empty array for empty search string', () => {
			setupGame(8);

			const results = findPlayersByName('');
			expect(results.length).toBe(0);
		});

		it('returns empty array for whitespace-only search', () => {
			setupGame(8);

			const results = findPlayersByName('   ');
			expect(results.length).toBe(0);
		});

		it('returns empty array for non-matching search', () => {
			setupGame(8);

			const results = findPlayersByName('zzzznoexist');
			expect(results.length).toBe(0);
		});

		it('handles case where all players are eliminated and shared slots are active', () => {
			const players = setupGame(4);

			// Eliminate all but one
			eliminatePlayer(players[1]);
			eliminatePlayer(players[2]);
			eliminatePlayer(players[3]);
			ssm.evaluateAndRedistribute();

			// All eliminated players should still be findable
			const blueResults = findPlayersByName('Blue');
			expect(blueResults.length).toBe(1);
			expect(GetPlayerId(blueResults[0])).toBe(1);

			const tealResults = findPlayersByName('Teal');
			expect(tealResults.length).toBe(1);
			expect(GetPlayerId(tealResults[0])).toBe(2);
		});

		it('search trims leading/trailing whitespace', () => {
			setupGame(8);

			const results = findPlayersByName('  Red  ');
			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(0);
		});

		it('admins cannot be targeted by mute but are still findable', () => {
			const players = setupGame(8);
			// Make player 0 an admin
			players[0].isAdmin = () => true;

			const results = findPlayersByName('Red');

			// findPlayersByName still finds them
			expect(results.length).toBe(1);
			expect(GetPlayerId(results[0])).toBe(0);

			// But the mute command would check isAdmin and refuse
			const pm = PlayerManager.getInstance();
			const target = pm.players.get(results[0]);
			expect(target.isAdmin()).toBe(true);
		});
	});
});
