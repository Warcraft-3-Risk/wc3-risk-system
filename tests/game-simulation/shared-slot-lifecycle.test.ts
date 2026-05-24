/**
 * Integration tests for the SharedSlotManager lifecycle.
 *
 * Exercises the REAL SharedSlotManager through a simulated multi-turn game:
 * - Game starts with many players (e.g. 14)
 * - Players are progressively eliminated
 * - When active count drops to ≤ 11, shared slots activate
 * - Empty/eliminated player slots are redistributed to active players
 * - Units are assigned to lowest-count shared slots as they spawn
 * - Further eliminations trigger rebalancing
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './helpers/wc3-integration-shim';
import { resetAllSingletons, configureSettings, createFakeActivePlayer, setupPlayerManager } from './helpers/setup';

// ─── Functional Unit API ────────────────────────────────────────────
// Override the no-op stubs from wc3-integration-shim with a functional
// implementation for unit tracking in lifecycle tests.

interface TestUnit {
	owner: any;
	alive: boolean;
}

/** Global registry of all test units. */
const allTestUnits: TestUnit[] = [];

function createTestUnit(owner: any, opts?: Partial<TestUnit>): TestUnit {
	const u: TestUnit = {
		owner,
		alive: true,
		...opts,
	};
	allTestUnits.push(u);
	return u;
}

function clearTestUnits(): void {
	allTestUnits.length = 0;
}

(globalThis as any).GetOwningPlayer = (u: TestUnit) => u.owner;

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
vi.mock('src/app/managers/names/name-manager', () => ({
	NameManager: {
		getInstance: () => ({
			getDisplayName: (p: any) => `Player ${p?.id ?? '?'}`,
			getBtag: () => 'test#0000',
			setName: vi.fn(),
			setColor: vi.fn(),
			getOriginalColor: () => 0,
			getDisplayColorCode: () => '|cFFFFFFFF',
			copyDisplayNameToSlot: vi.fn(),
			resetOriginalColors: vi.fn(),
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

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Build a game with `count` active players (IDs 0..count-1).
 * Remaining player slots (count..23) are marked as 'empty'.
 */
function setupGame(count: number) {
	const players: any[] = [];
	for (let i = 0; i < count; i++) {
		players.push(createFakeActivePlayer(i));
	}

	// Mark remaining slots as empty (so getEmptyPlayerSlots finds them)
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

	// Override PlayerManager mock methods so SharedSlotManager can discover
	// empty player slots and left-with-no-units players.
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
	pmInstance.getPlayersThatLeftWithNoUnitsOrCities = () => {
		const left: any[] = [];
		for (let i = 0; i < 24; i++) {
			const p = Player(i) as any;
			if (p.slotState === 'left') {
				const ap = pmInstance.players.get(p);
				if (ap && ap.trackedData.units.size === 0 && ap.trackedData.cities.cities.length === 0) {
					left.push(p);
				}
			}
		}
		return left;
	};

	return players;
}

function eliminatePlayer(player: any) {
	player.status.set(PLAYER_STATUS.DEAD);
	player.trackedData.cities.cities = [];
	player.trackedData.units.clear();
}

function getActiveCount(players: any[]): number {
	return players.filter((p) => p.status.isActive()).length;
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('SharedSlotManager lifecycle integration', () => {
	let ssm: SharedSlotManager;

	beforeEach(() => {
		resetAllSingletons();
		SharedSlotManager.resetInstance();
		configureSettings({ diplomacy: 0 }); // FFA
		clearTestUnits();
		ssm = SharedSlotManager.getInstance();
	});

	afterEach(() => {
		resetAllSingletons();
		SharedSlotManager.resetInstance();
		clearTestUnits();
	});

	describe('activation threshold', () => {
		it('does nothing when more than 11 players are active', () => {
			const players = setupGame(14);
			const changed = ssm.evaluateAndRedistribute();

			expect(changed).toBe(false);
			expect(getActiveCount(players)).toBe(14);
		});

		it('activates when active players drop to exactly 11', () => {
			const players = setupGame(14);

			// Eliminate 3 players → 11 remain
			eliminatePlayer(players[11]);
			eliminatePlayer(players[12]);
			eliminatePlayer(players[13]);

			const changed = ssm.evaluateAndRedistribute();
			expect(changed).toBe(true);
			expect(getActiveCount(players)).toBe(11);
		});

		it('activates when active players drop below 11', () => {
			const players = setupGame(14);

			// Eliminate 5 players → 9 remain
			for (let i = 9; i < 14; i++) {
				eliminatePlayer(players[i]);
			}

			const changed = ssm.evaluateAndRedistribute();
			expect(changed).toBe(true);
		});
	});

	describe('slot allocation on elimination', () => {
		it('allocates eliminated player slots plus empty slots evenly', () => {
			const players = setupGame(14);

			// Eliminate 3 → 11 active, 3 eliminated slots + 10 empty slots = 13 available
			eliminatePlayer(players[11]);
			eliminatePlayer(players[12]);
			eliminatePlayer(players[13]);

			ssm.evaluateAndRedistribute();

			// Each of the 11 active players should get floor(13/11) = 1 shared slot
			// With 2 leftover unassigned
			for (let i = 0; i < 11; i++) {
				const slots = ssm.getSharedSlotsByPlayer(players[i].getPlayer());
				expect(slots.length).toBeGreaterThanOrEqual(1);
			}
		});

		it('allocates more slots as more players are eliminated', () => {
			const players = setupGame(14);

			// Phase 1: eliminate 3 → 11 active
			eliminatePlayer(players[11]);
			eliminatePlayer(players[12]);
			eliminatePlayer(players[13]);
			ssm.evaluateAndRedistribute();

			const phase1Slots = ssm.getSharedSlotsByPlayer(players[0].getPlayer()).length;

			// Phase 2: eliminate 3 more → 8 active
			eliminatePlayer(players[8]);
			eliminatePlayer(players[9]);
			eliminatePlayer(players[10]);
			ssm.evaluateAndRedistribute();

			const phase2Slots = ssm.getSharedSlotsByPlayer(players[0].getPlayer()).length;

			// With fewer active players and more freed slots, each player gets more
			expect(phase2Slots).toBeGreaterThan(phase1Slots);
		});

		it('does not assign a player its own handle as a shared slot', () => {
			const players = setupGame(12);

			// Eliminate 1 → 11 active
			eliminatePlayer(players[11]);
			ssm.evaluateAndRedistribute();

			for (let i = 0; i < 11; i++) {
				const p = players[i].getPlayer();
				const slots = ssm.getSharedSlotsByPlayer(p);
				for (const slot of slots) {
					expect(GetPlayerId(slot)).not.toBe(GetPlayerId(p));
				}
			}
		});
	});

	describe('unit assignment to shared slots', () => {
		it('getSlotWithLowestUnitCount returns the player handle when no shared slots exist', () => {
			const players = setupGame(14);
			const p = players[0].getPlayer();

			const slot = ssm.getSlotWithLowestUnitCount(p);
			expect(slot).toBe(p);
		});

		it('getSlotWithLowestUnitCount returns the slot with fewer units', () => {
			const players = setupGame(12);

			// Eliminate 1 → 11 active, triggers allocation
			eliminatePlayer(players[11]);
			ssm.evaluateAndRedistribute();

			const p = players[0].getPlayer();
			const slots = ssm.getSharedSlotsByPlayer(p);

			// Simulate: player's own slot has 5 units, shared slot has 0
			ssm.incrementUnitCount(p);
			ssm.incrementUnitCount(p);
			ssm.incrementUnitCount(p);
			ssm.incrementUnitCount(p);
			ssm.incrementUnitCount(p);

			const best = ssm.getSlotWithLowestUnitCount(p);
			// Should pick a shared slot (which has 0 units) over the player's own (5 units)
			if (slots.length > 0) {
				expect(best).not.toBe(p);
				expect(ssm.getUnitCount(best)).toBe(0);
			}
		});

		it('balances unit counts across multiple shared slots', () => {
			const players = setupGame(14);

			// Eliminate enough to get multiple slots per player
			// Eliminate 8 → 6 active, 8 eliminated + 10 empty = 18 total shared slots
			// 18 / 6 = 3 shared slots each
			for (let i = 6; i < 14; i++) {
				eliminatePlayer(players[i]);
			}
			ssm.evaluateAndRedistribute();

			const p = players[0].getPlayer();
			const slots = ssm.getSharedSlotsByPlayer(p);
			const allSlots = [p, ...slots];

			// Simulate spawning 12 units, always using getSlotWithLowestUnitCount
			for (let i = 0; i < 12; i++) {
				const targetSlot = ssm.getSlotWithLowestUnitCount(p);
				ssm.incrementUnitCount(targetSlot);
				createTestUnit(targetSlot);
			}

			// Assert units are spread across all slots
			const counts = allSlots.map((s) => ssm.getUnitCount(s));
			const maxCount = Math.max(...counts);
			const minCount = Math.min(...counts);

			// The difference between max and min should be at most 1 (balanced)
			expect(maxCount - minCount).toBeLessThanOrEqual(1);
		});
	});

	describe('progressive elimination scenario', () => {
		it('simulates full game lifecycle: 14 players → progressive elimination → shared slots grow', () => {
			const players = setupGame(14);

			// --- Turn 1: 14 players active, shared slots not yet active ---
			expect(ssm.evaluateAndRedistribute()).toBe(false);

			// --- Turn 2: 3 eliminated → 11 active, activation! ---
			eliminatePlayer(players[11]);
			eliminatePlayer(players[12]);
			eliminatePlayer(players[13]);
			expect(ssm.evaluateAndRedistribute()).toBe(true);

			// Each active player should now have shared slots
			const phase1TotalSlots = new Set<any>();
			for (let i = 0; i < 11; i++) {
				const slots = ssm.getSharedSlotsByPlayer(players[i].getPlayer());
				expect(slots.length).toBeGreaterThanOrEqual(1);
				slots.forEach((s) => phase1TotalSlots.add(GetPlayerId(s)));
			}

			// Spawn units using shared slots
			for (let i = 0; i < 11; i++) {
				const p = players[i].getPlayer();
				for (let j = 0; j < 5; j++) {
					const slot = ssm.getSlotWithLowestUnitCount(p);
					ssm.incrementUnitCount(slot);
					createTestUnit(slot);
				}
			}

			// --- Turn 3: 2 more eliminated → 9 active ---
			// Clear units from the eliminated players' slots
			const elim9 = players[9];
			const elim10 = players[10];

			// Remove units from eliminated players' slots (simulate deaths)
			for (const u of allTestUnits.filter((u) => u.owner === elim9.getPlayer())) {
				u.alive = false;
				ssm.decrementUnitCount(elim9.getPlayer());
			}
			for (const slot of ssm.getSharedSlotsByPlayer(elim9.getPlayer())) {
				for (const u of allTestUnits.filter((u) => u.owner === slot)) {
					u.alive = false;
					ssm.decrementUnitCount(slot);
				}
			}
			eliminatePlayer(elim9);

			for (const u of allTestUnits.filter((u) => u.owner === elim10.getPlayer())) {
				u.alive = false;
				ssm.decrementUnitCount(elim10.getPlayer());
			}
			for (const slot of ssm.getSharedSlotsByPlayer(elim10.getPlayer())) {
				for (const u of allTestUnits.filter((u) => u.owner === slot)) {
					u.alive = false;
					ssm.decrementUnitCount(slot);
				}
			}
			eliminatePlayer(elim10);

			expect(ssm.evaluateAndRedistribute()).toBe(true);

			// With fewer active players, each should now have MORE shared slots
			for (let i = 0; i < 9; i++) {
				const slots = ssm.getSharedSlotsByPlayer(players[i].getPlayer());
				// 9 active players, at least 14 freed slots (3 elim + 10 empty + 2 new elim)
				// floor(15/9) = 1 minimum, but with empty slots it's more
				expect(slots.length).toBeGreaterThanOrEqual(1);
			}

			// --- Turn 4: 4 more eliminated → 5 active ---
			for (let k = 5; k < 9; k++) {
				const p = players[k].getPlayer();
				for (const u of allTestUnits.filter((u) => u.owner === p && u.alive)) {
					u.alive = false;
					ssm.decrementUnitCount(p);
				}
				for (const slot of ssm.getSharedSlotsByPlayer(p)) {
					for (const u of allTestUnits.filter((u) => u.owner === slot && u.alive)) {
						u.alive = false;
						ssm.decrementUnitCount(slot);
					}
				}
				eliminatePlayer(players[k]);
			}

			expect(ssm.evaluateAndRedistribute()).toBe(true);

			// 5 active players dividing all available slots
			// We should see significant slot counts per player
			for (let i = 0; i < 5; i++) {
				const slots = ssm.getSharedSlotsByPlayer(players[i].getPlayer());
				// With ~19 slots available for 5 players, each gets floor(19/5) = 3+
				expect(slots.length).toBeGreaterThanOrEqual(2);
			}

			// Continue spawning units — they should be balanced across all slots
			for (let i = 0; i < 5; i++) {
				const p = players[i].getPlayer();
				for (let j = 0; j < 20; j++) {
					const slot = ssm.getSlotWithLowestUnitCount(p);
					ssm.incrementUnitCount(slot);
					createTestUnit(slot);
				}
			}

			// Verify balance for each surviving player
			for (let i = 0; i < 5; i++) {
				const p = players[i].getPlayer();
				const slots = [p, ...ssm.getSharedSlotsByPlayer(p)];
				const counts = slots.map((s) => ssm.getUnitCount(s));
				const maxCount = Math.max(...counts);
				const minCount = Math.min(...counts);

				// Balanced spawning: max - min ≤ 1
				expect(maxCount - minCount).toBeLessThanOrEqual(1);
			}
		});
	});

	describe('getOwner and ownership queries', () => {
		it('getOwner returns the real player for a shared slot', () => {
			const players = setupGame(12);
			eliminatePlayer(players[11]);
			ssm.evaluateAndRedistribute();

			const p0 = players[0].getPlayer();
			const slots = ssm.getSharedSlotsByPlayer(p0);

			if (slots.length > 0) {
				const owner = ssm.getOwner(slots[0]);
				expect(owner).toBe(p0);
			}
		});

		it('getOwner returns the player itself for a non-shared player', () => {
			const players = setupGame(14);
			const p0 = players[0].getPlayer();
			expect(ssm.getOwner(p0)).toBe(p0);
		});

		it('canPlayerSeeUnitTooltip works through shared slots', () => {
			const players = setupGame(12);
			eliminatePlayer(players[11]);
			ssm.evaluateAndRedistribute();

			const p0 = players[0].getPlayer();
			const slots = ssm.getSharedSlotsByPlayer(p0);

			if (slots.length > 0) {
				const u = createTestUnit(slots[0]);
				expect(ssm.canPlayerSeeUnitTooltip(u as any, p0)).toBe(true);
			}
		});

		it('eliminated players (observers) can see all tooltips', () => {
			const players = setupGame(12);
			eliminatePlayer(players[11]);
			ssm.evaluateAndRedistribute();

			const u = createTestUnit(players[0].getPlayer());
			expect(ssm.canPlayerSeeUnitTooltip(u as any, players[11].getPlayer())).toBe(true);
		});
	});

	describe('pending free slots', () => {
		it('marks slots as pending when eliminated player still has units', () => {
			const players = setupGame(12);

			// Eliminate 1 → activate
			eliminatePlayer(players[11]);
			ssm.evaluateAndRedistribute();

			// Now eliminate player 10 but leave units alive on their slot
			const p10 = players[10].getPlayer();
			createTestUnit(p10);
			ssm.incrementUnitCount(p10);
			players[10].status.set(PLAYER_STATUS.DEAD);
			// Don't clear cities/units — the slot still has units

			ssm.evaluateAndRedistribute();

			// The slot should be pending (has units, can't be freed yet)
			expect(ssm.getPendingFreeSlots().has(p10)).toBe(true);
		});

		it('frees pending slots once units are gone', () => {
			const players = setupGame(12);

			eliminatePlayer(players[11]);
			ssm.evaluateAndRedistribute();

			// Eliminate p10 with units alive
			const p10 = players[10].getPlayer();
			createTestUnit(p10);
			ssm.incrementUnitCount(p10);
			players[10].status.set(PLAYER_STATUS.DEAD);
			players[10].trackedData.cities.cities = [];

			ssm.evaluateAndRedistribute();
			expect(ssm.getPendingFreeSlots().has(p10)).toBe(true);

			// Now simulate all units dying
			ssm.decrementUnitCount(p10);
			allTestUnits.forEach((u) => {
				if (u.owner === p10) u.alive = false;
			});

			ssm.evaluateAndRedistribute();

			// Should no longer be pending
			expect(ssm.getPendingFreeSlots().has(p10)).toBe(false);
		});
	});

	describe('idempotency', () => {
		it('second call returns false when slot counts match the target exactly', () => {
			// 12 players, eliminate 4 → 8 active
			// Available: 4 eliminated + 12 empty slots = 16. floor(16/8) = 2 each, 0 leftover
			const players = setupGame(12);
			for (let i = 8; i < 12; i++) {
				eliminatePlayer(players[i]);
			}

			const first = ssm.evaluateAndRedistribute();
			expect(first).toBe(true);

			// Second call should find no changes since all slots are perfectly assigned
			const second = ssm.evaluateAndRedistribute();
			expect(second).toBe(false);
		});

		it('repeated calls are safe even when leftover slots exist', () => {
			// Non-evenly-divisible case: 14 players, 3 eliminated → 11 active
			// Available slots won't divide evenly, so leftovers exist
			const players = setupGame(14);
			for (let i = 11; i < 14; i++) {
				eliminatePlayer(players[i]);
			}

			ssm.evaluateAndRedistribute();
			// Repeated calls should not error or corrupt state
			ssm.evaluateAndRedistribute();
			ssm.evaluateAndRedistribute();

			// State should still be valid
			for (let i = 0; i < 11; i++) {
				const slots = ssm.getSharedSlotsByPlayer(players[i].getPlayer());
				expect(slots.length).toBeGreaterThanOrEqual(1);
			}
		});
	});
});
