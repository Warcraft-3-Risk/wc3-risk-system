/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, type MockInstance } from 'vitest';

// ─── Module Mocks ───────────────────────────────────────────────────
vi.mock('w3ts', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));
vi.mock('w3ts/system/file', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));
// ────────────────────────────────────────────────────────────────────

import './helpers/wc3-integration-shim';
import { TransportManager } from '../../src/app/managers/transport-manager';
import { AllyColorFilterManager } from '../../src/app/managers/ally-color-filter-manager';
import { MinimapIconManager } from '../../src/app/managers/minimap-icon-manager';
import { UnitLagManager } from '../../src/app/game/services/unit-lag-manager';

describe('TransportManager - Unload Color Application', () => {
	let mockApplyColorFilter: MockInstance;
	let mockRegisterIfValid: MockInstance;

	beforeEach(() => {
		// Reset singletons for testing
		(TransportManager as any).instance = undefined;
		(TransportManager as any).delayedTrackQueue = [];

		// Mock MinimapIconManager
		mockRegisterIfValid = vi.fn();
		const minIconObj = { registerIfValid: mockRegisterIfValid, unregisterTrackedUnit: vi.fn() };
		vi.spyOn(MinimapIconManager, 'getInstance').mockReturnValue(minIconObj as any);

		// Mock UnitLagManager
		const lagObj = { trackUnit: vi.fn(), untrackUnit: vi.fn() };
		vi.spyOn(UnitLagManager, 'getInstance').mockReturnValue(lagObj as any);

		// Spy on AllyColorFilterManager.getInstance().applyColorFilter
		mockApplyColorFilter = vi.fn();
		vi.spyOn(AllyColorFilterManager, 'getInstance').mockReturnValue({
			applyColorFilter: mockApplyColorFilter,
			getTooltipColorHex: vi.fn(),
		} as any);

		// Required natives stub that may have been skipped
		(globalThis as any).GetUnitName = () => 'MockUnit';
		(globalThis as any).UnitAlive = () => true;
		(globalThis as any).IsUnitLoaded = () => false;
		(globalThis as any).IsUnitType = () => false;
		(globalThis as any).FourCC = () => 1234;
		(globalThis as any).GetTerrainType = () => 1234;
		(globalThis as any).CreateTrigger = () => ({});
		(globalThis as any).TriggerRegisterPlayerUnitEvent = () => {};
		(globalThis as any).TriggerAddCondition = () => {};
		(globalThis as any).Condition = (fn: any) => fn;
		(globalThis as any).bj_MAX_PLAYERS = 24;
		(globalThis as any).TimerStart = () => {};
		(globalThis as any).EVENT_PLAYER_UNIT_LOADED = {};
		(globalThis as any).EVENT_PLAYER_UNIT_ISSUED_TARGET_ORDER = {};
		(globalThis as any).EVENT_PLAYER_UNIT_ISSUED_POINT_ORDER = {};
		(globalThis as any).EVENT_PLAYER_UNIT_ISSUED_ORDER = {};
		(globalThis as any).EVENT_PLAYER_UNIT_SPELL_EFFECT = {};
		(globalThis as any).EVENT_PLAYER_UNIT_SPELL_ENDCAST = {};
		(globalThis as any).EVENT_PLAYER_UNIT_SPELL_CHANNEL = {};
		(globalThis as any).EVENT_PLAYER_UNIT_SPELL_CAST = {};
		(globalThis as any).CreateTimer = () => ({});
		(globalThis as any).Player = () => ({});
		(globalThis as any).BlzGetFrameByName = () => ({});
		(globalThis as any).BlzCreateFrame = () => ({});
		(globalThis as any).BlzFrameSetPoint = () => {};
		(globalThis as any).BlzFrameSetAlpha = () => {};
		(globalThis as any).BlzFrameSetEnable = () => {};
		(globalThis as any).BlzDestroyFrame = () => {};
		(globalThis as any).FRAMEPOINT_BOTTOMLEFT = {};
		(globalThis as any).FRAMEPOINT_TOPRIGHT = {};
	});

	it('should call applyColorFilter for unloaded units in processDelayedTrackQueue', () => {
		const fakeUnit = {} as any;

		// Given a unit in the delayed track queue
		(TransportManager as any).delayedTrackQueue.push(fakeUnit);

		const tm = TransportManager.getInstance();

		// When the queue is processed
		(tm as any).processDelayedTrackQueue();

		// Then applyColorFilter should be called
		expect(mockApplyColorFilter).toHaveBeenCalledWith(fakeUnit);
		expect(mockApplyColorFilter).toHaveBeenCalledTimes(1);
		expect(mockRegisterIfValid).toHaveBeenCalledWith(fakeUnit, true);
		expect(mockRegisterIfValid).toHaveBeenCalledTimes(1);
	});

	it('should call applyColorFilter for units when a transport dies', () => {
		const fakeTransportUnit = {} as any;
		const fakeCargoUnit1 = { id: 1 } as any;
		const fakeCargoUnit2 = { id: 2 } as any;

		const tm = TransportManager.getInstance();
		tm.add(fakeTransportUnit);

		const transportData = (tm as any).transports.get(fakeTransportUnit);
		transportData.cargo = [fakeCargoUnit1, fakeCargoUnit2];

		// When the transport dies
		tm.onDeath({} as any, fakeTransportUnit);

		// Then applyColorFilter should be called for each cargo unit
		expect(mockApplyColorFilter).toHaveBeenCalledWith(fakeCargoUnit1);
		expect(mockApplyColorFilter).toHaveBeenCalledWith(fakeCargoUnit2);
		expect(mockApplyColorFilter).toHaveBeenCalledTimes(2);
		expect(mockRegisterIfValid).toHaveBeenCalledWith(fakeCargoUnit1, true);
		expect(mockRegisterIfValid).toHaveBeenCalledWith(fakeCargoUnit2, true);
		expect(mockRegisterIfValid).toHaveBeenCalledTimes(2);
	});
});
