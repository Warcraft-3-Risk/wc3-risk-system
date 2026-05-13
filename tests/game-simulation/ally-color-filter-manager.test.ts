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

describe('AllyColorFilterManager', () => {
	let localPlayer: any;
	let enemyPlayer: any;
	let allyPlayer: any;
	let neutralHostilePlayer: any;
	let activeLocalPlayer: any;

	let mockVertexColors: Map<FakeUnitHandle, { r: number; g: number; b: number; a: number }>;
	let mockUnitColors: Map<FakeUnitHandle, any>;
	let mockAllyColorFilterState: number;

	beforeEach(() => {
		// Reset singletons
		(SharedSlotManager as any).instance = undefined;
		(PlayerManager as any).instance = undefined;
		(AllyColorState as any).instance = undefined;

		// Mock WC3 globals for this test
		localPlayer = { id: 0, isFakePlayerHandle: true } as any;
		enemyPlayer = { id: 1, isFakePlayerHandle: true } as any;
		allyPlayer = { id: 2, isFakePlayerHandle: true } as any;
		// Set neutralHostilePlayer to exactly what utils imports
		neutralHostilePlayer = NEUTRAL_HOSTILE;

		(globalThis as any).GetLocalPlayer = () => localPlayer;
		(globalThis as any).IsPlayerAlly = (p1: any, p2: any) => p1.id === p2.id || (p1.id === localPlayer.id && p2.id === allyPlayer.id);

		mockAllyColorFilterState = 2; // Default to High Contrast (Mode 2)
		(AllyColorFilterManager as any).instance = undefined;
		(globalThis as any).GetAllyColorFilterState = () => mockAllyColorFilterState;

		mockVertexColors = new Map();
		mockUnitColors = new Map();
		(globalThis as any).GetPlayerColor = (p: any) => p?.color ?? p?.id ?? 0;
		(globalThis as any).SetUnitColor = (u: any, c: any) => mockUnitColors.set(u, c);
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
});
