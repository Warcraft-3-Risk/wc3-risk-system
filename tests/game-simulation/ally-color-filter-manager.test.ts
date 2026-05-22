/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import './helpers/wc3-integration-shim';

// ─── Module Mocks ───────────────────────────────────────────────────
vi.mock('w3ts', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));
vi.mock('w3ts/system/file', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));
// ────────────────────────────────────────────────────────────────────

import { AllyColorFilterManager } from '../../src/app/managers/ally-color-filter-manager';
import { AllyColorState } from '../../src/app/managers/alliances/ally-color-state';
import { SharedSlotManager } from '../../src/app/game/services/shared-slot-manager';
import { PlayerManager } from '../../src/app/player/player-manager';
import { UNIT_TYPE } from '../../src/app/utils/unit-types';
import { FakeUnitHandle } from '../fixtures/fake-unit';
import { NEUTRAL_HOSTILE } from '../../src/app/utils/utils';
import { NameManager } from '../../src/app/managers/names/name-manager';

describe('AllyColorFilterManager', () => {
	let localPlayer: any;
	let enemyPlayer: any;
	let allyPlayer: any;
	let neutralHostilePlayer: any;
	let activeLocalPlayer: any;

	let mockVertexColors: Map<FakeUnitHandle, { r: number; g: number; b: number; a: number }>;
	let mockUnitColors: Map<FakeUnitHandle, any>;
	let mockPlayerColors: Map<any, any>;
	let mockAllyColorFilterState: number;

	beforeEach(() => {
		// Reset singletons
		(SharedSlotManager as any).instance = undefined;
		(PlayerManager as any).instance = undefined;
		(AllyColorState as any).instance = undefined;
		(NameManager as any).instance = undefined;

		// Mock WC3 globals for this test
		localPlayer = Player(0) as any;
		enemyPlayer = Player(1) as any;
		allyPlayer = Player(2) as any;
		localPlayer.color = 0;
		enemyPlayer.color = 1;
		allyPlayer.color = 2;
		// Set neutralHostilePlayer to exactly what utils imports
		neutralHostilePlayer = NEUTRAL_HOSTILE;

		(globalThis as any).GetLocalPlayer = () => localPlayer;
		(globalThis as any).IsPlayerAlly = (p1: any, p2: any) =>
			p1.id === p2.id || (p1.id === localPlayer.id && p2.id === allyPlayer.id) || (p1.id === allyPlayer.id && p2.id === localPlayer.id);

		mockAllyColorFilterState = 2; // Default to High Contrast (Mode 2)
		(AllyColorFilterManager as any).instance = undefined;
		(globalThis as any).GetAllyColorFilterState = () => mockAllyColorFilterState;

		mockVertexColors = new Map();
		mockUnitColors = new Map();
		mockPlayerColors = new Map();
		(globalThis as any).GetPlayerColor = (p: any) => p?.color ?? p?.id ?? 0;
		(globalThis as any).SetUnitColor = (u: any, c: any) => mockUnitColors.set(u, c);
		(globalThis as any).SetPlayerColor = (p: any, c: any) => {
			mockPlayerColors.set(p, c);
			p.color = c;
		};
		(globalThis as any).SetUnitVertexColor = (u: any, r: number, g: number, b: number, a: number) => {
			mockVertexColors.set(u, { r, g, b, a });
		};

		(globalThis as any).IsUnitType = (u: any, type: UNIT_TYPE) => {
			if (u.typeIds) return u.typeIds.includes(type);
			return false;
		};

		// Removed require for utilsModule

		// Mock SharedSlotManager to simply return the unit's owner natively for testing
		const ssmRegex = vi.spyOn(SharedSlotManager.getInstance(), 'getOwnerOfUnit');
		ssmRegex.mockImplementation((u: any) => u.owner);

		// Mock PlayerManager
		activeLocalPlayer = {
			options: { colorblind: false, colorContrast: true },
			trackedData: { units: new Set(), transports: new Set() },
		};
		const pmMock = {
			players: new Map([[localPlayer, activeLocalPlayer]]),
		};
		const pmRegex = vi.spyOn(PlayerManager, 'getInstance');
		pmRegex.mockImplementation(() => pmMock as any);
	});

	describe('applyColorFilter', () => {
		it('applies black (0,0,0) to neutral units in Mode 2', () => {
			const unit = { owner: neutralHostilePlayer } as unknown as FakeUnitHandle;
			AllyColorFilterManager.getInstance().applyColorFilter(unit as any);
			expect(mockVertexColors.get(unit)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
		});

		it('applies blue (0,0,255) to local player units in Mode 2', () => {
			const unit = { owner: localPlayer } as unknown as FakeUnitHandle;
			AllyColorFilterManager.getInstance().applyColorFilter(unit as any);
			expect(mockVertexColors.get(unit)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
		});

		it('applies teal (0,255,255) to ally units when not colorblind in Mode 2', () => {
			const unit = { owner: allyPlayer } as unknown as FakeUnitHandle;
			AllyColorFilterManager.getInstance().applyColorFilter(unit as any);
			expect(mockVertexColors.get(unit)).toEqual({ r: 0, g: 255, b: 255, a: 255 });
		});

		it('applies yellow (255,255,0) to ally units when colorblind in Mode 2', () => {
			activeLocalPlayer.options.colorblind = true;
			AllyColorFilterManager.getInstance().recalculate();
			const unit = { owner: allyPlayer } as unknown as FakeUnitHandle;
			AllyColorFilterManager.getInstance().applyColorFilter(unit as any);
			expect(mockVertexColors.get(unit)).toEqual({ r: 255, g: 255, b: 0, a: 255 });
		});

		it('applies red (255,50,50) to enemy units in Mode 2', () => {
			const unit = { owner: enemyPlayer } as unknown as FakeUnitHandle;
			AllyColorFilterManager.getInstance().applyColorFilter(unit as any);
			expect(mockVertexColors.get(unit)).toEqual({ r: 255, g: 50, b: 50, a: 255 });
		});

		it('applies transparency (150 alpha) to local player spawns in Mode 2', () => {
			const unit = { owner: localPlayer, typeIds: [UNIT_TYPE.SPAWN] } as unknown as FakeUnitHandle;
			AllyColorFilterManager.getInstance().applyColorFilter(unit as any);
			expect(mockVertexColors.get(unit)).toEqual({ r: 0, g: 0, b: 255, a: 150 });
		});

		it('resets color to white in Mode 0', () => {
			activeLocalPlayer.options.colorContrast = false;
			AllyColorFilterManager.getInstance().recalculate();
			const unit = { owner: enemyPlayer } as unknown as FakeUnitHandle;
			AllyColorFilterManager.getInstance().applyColorFilter(unit as any);
			expect(mockVertexColors.get(unit)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
		});

		it('uses current player colors when colors change after the cache is created', () => {
			activeLocalPlayer.options.colorContrast = false;
			const bluePlayer = Player(1) as any;
			bluePlayer.color = 'PURPLE_BEFORE_RANDOMIZATION';

			const manager = AllyColorFilterManager.getInstance();
			bluePlayer.color = 'BLUE_AFTER_RANDOMIZATION';

			const unit = { owner: bluePlayer } as unknown as FakeUnitHandle;
			manager.applyColorFilter(unit as any);

			expect(mockUnitColors.get(unit)).toBe('BLUE_AFTER_RANDOMIZATION');
		});

		it('does not sync the raw owner player color while applying a unit filter', () => {
			activeLocalPlayer.options.colorContrast = false;
			const realOwner = Player(1) as any;
			const rawOwner = Player(12) as any;
			realOwner.color = 'PURPLE';
			rawOwner.color = 'MAROON';

			vi.spyOn(SharedSlotManager.getInstance(), 'getOwnerOfUnit').mockImplementation((u: any) => u.realOwner);
			AllyColorFilterManager.getInstance().recalculate();

			const unit = { owner: rawOwner, realOwner } as unknown as FakeUnitHandle;
			AllyColorFilterManager.getInstance().applyColorFilter(unit as any);

			expect(mockUnitColors.get(unit)).toBe('PURPLE');
			expect(mockPlayerColors.size).toBe(0);
		});

		it('keeps neutral units neutral in custom ally mode 2', () => {
			activeLocalPlayer.options.colorContrast = false;
			neutralHostilePlayer.color = 'NEUTRAL_COLOR';
			(AllyColorState as any).instance = new AllyColorState({
				loadMode: () => 2,
				saveMode: vi.fn(),
			});
			(AllyColorFilterManager as any).instance = undefined;

			const unit = { owner: neutralHostilePlayer } as unknown as FakeUnitHandle;
			AllyColorFilterManager.getInstance().applyColorFilter(unit as any);

			expect(mockUnitColors.get(unit)).toBe('NEUTRAL_COLOR');
			expect(mockVertexColors.get(unit)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
		});
	});

	describe('applyPlayerColorFilter', () => {
		it('syncs raw owner player color to the resolved model color in Mode 0 as a separate pass', () => {
			activeLocalPlayer.options.colorContrast = false;
			const realOwner = Player(1) as any;
			const rawOwner = Player(12) as any;
			NameManager.getInstance().setColor(realOwner, PLAYER_COLOR_PURPLE);
			realOwner.color = PLAYER_COLOR_RED;
			rawOwner.color = PLAYER_COLOR_MAROON;

			vi.spyOn(SharedSlotManager.getInstance(), 'getOwner').mockImplementation((p: any) => (p === rawOwner ? realOwner : p));
			AllyColorFilterManager.getInstance().applyPlayerColorFilter();

			expect(mockPlayerColors.get(rawOwner)).toBe(PLAYER_COLOR_PURPLE);
		});

		it('applies relationship player colors in Mode 2 as a separate local pass', () => {
			localPlayer.color = 'LOCAL_BASE';
			allyPlayer.color = 'ALLY_BASE';
			enemyPlayer.color = 'ENEMY_BASE';
			(AllyColorState as any).instance = new AllyColorState({
				loadMode: () => 2,
				saveMode: vi.fn(),
			});
			(AllyColorFilterManager as any).instance = undefined;

			AllyColorFilterManager.getInstance().applyPlayerColorFilter();

			expect(mockPlayerColors.get(localPlayer)).toBe(ConvertPlayerColor(1));
			expect(mockPlayerColors.get(allyPlayer)).toBe(ConvertPlayerColor(2));
			expect(mockPlayerColors.get(enemyPlayer)).toBe(ConvertPlayerColor(0));
		});
	});

	describe('getTooltipColorHex', () => {
		it('returns gray for neutral units in Mode 2', () => {
			const unit = { owner: neutralHostilePlayer } as unknown as FakeUnitHandle;
			const hex = AllyColorFilterManager.getInstance().getTooltipColorHex(unit as any);
			expect(hex).toBe('|cFF888888');
		});

		it('returns blue for local player units in Mode 2', () => {
			const unit = { owner: localPlayer } as unknown as FakeUnitHandle;
			const hex = AllyColorFilterManager.getInstance().getTooltipColorHex(unit as any);
			expect(hex).toBe('|cFF0000FF');
		});

		it('returns teal for ally units when not colorblind in Mode 2', () => {
			const unit = { owner: allyPlayer } as unknown as FakeUnitHandle;
			const hex = AllyColorFilterManager.getInstance().getTooltipColorHex(unit as any);
			expect(hex).toBe('|cFF00FFFF');
		});

		it('does not return ally color text for Mode 1 without color contrast', () => {
			activeLocalPlayer.options.colorContrast = false;
			(AllyColorState as any).instance = new AllyColorState({
				loadMode: () => 1,
				saveMode: vi.fn(),
			});
			(AllyColorFilterManager as any).instance = undefined;

			const unit = { owner: allyPlayer } as unknown as FakeUnitHandle;
			const hex = AllyColorFilterManager.getInstance().getTooltipColorHex(unit as any);
			expect(hex).toBeUndefined();
		});

		it('returns yellow for ally units when colorblind in Mode 2', () => {
			activeLocalPlayer.options.colorblind = true;
			AllyColorFilterManager.getInstance().recalculate();
			const unit = { owner: allyPlayer } as unknown as FakeUnitHandle;
			const hex = AllyColorFilterManager.getInstance().getTooltipColorHex(unit as any);
			expect(hex).toBe('|cFFFFFF00');
		});

		it('returns red for enemy units in Mode 2', () => {
			const unit = { owner: enemyPlayer } as unknown as FakeUnitHandle;
			const hex = AllyColorFilterManager.getInstance().getTooltipColorHex(unit as any);
			expect(hex).toBe('|cFFFF0000');
		});

		it('returns undefined if not in Mode 2', () => {
			activeLocalPlayer.options.colorContrast = false;
			AllyColorFilterManager.getInstance().recalculate();
			const unit = { owner: enemyPlayer } as unknown as FakeUnitHandle;
			const hex = AllyColorFilterManager.getInstance().getTooltipColorHex(unit as any);
			expect(hex).toBeUndefined();
		});
	});

	describe('Player Slot Iteration', () => {
		it('processes up to bj_MAX_PLAYER_SLOTS without throwing exceptions', () => {
			let getPlayerCalls = 0;
			const originalPlayerFunc = (globalThis as any).Player;
			(globalThis as any).Player = (i: number) => {
				getPlayerCalls++;
				return originalPlayerFunc(i);
			};

			expect(() => {
				AllyColorFilterManager.getInstance().recalculate();
			}).not.toThrow();

			expect(getPlayerCalls).toBeGreaterThanOrEqual((globalThis as any).bj_MAX_PLAYER_SLOTS);

			// restore
			(globalThis as any).Player = originalPlayerFunc;
		});
	});

	describe('startPolling', () => {
		it('reapplies color filters to tracked transports when color mode state changes', () => {
			let pollCallback: () => void = () => {};
			(globalThis as any).CreateTimer = () => ({});
			(globalThis as any).TimerStart = (_timer: any, _timeout: number, _periodic: boolean, callback: () => void) => {
				pollCallback = callback;
			};
			mockAllyColorFilterState = 0;

			const transport = { owner: enemyPlayer, typeIds: [UNIT_TYPE.TRANSPORT] } as unknown as FakeUnitHandle;
			activeLocalPlayer.trackedData.transports.add(transport as any);

			AllyColorFilterManager.getInstance().startPolling();
			pollCallback();

			expect(mockVertexColors.get(transport)).toEqual({ r: 255, g: 50, b: 50, a: 255 });
		});
	});
});
