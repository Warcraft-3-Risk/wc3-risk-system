/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import './helpers/wc3-integration-shim';

const allyColorFilterMock = vi.hoisted(() => ({
	applyColorFilter: vi.fn(),
	markCitySeen: vi.fn(),
	clearSeenCityCache: vi.fn(),
}));

vi.mock('w3ts', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));

vi.mock('w3ts/system/file', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));

vi.mock('src/app/player/player-manager', () => ({
	PlayerManager: {
		getInstance: vi.fn(),
	},
}));

vi.mock('src/app/game/services/shared-slot-manager', () => ({
	SharedSlotManager: {
		getInstance: vi.fn(),
	},
}));

vi.mock('src/app/managers/names/name-manager', () => ({
	NameManager: {
		getInstance: () => ({
			getOriginalColor: (p: any) => p?.color ?? p?.id ?? 0,
		}),
	},
}));

vi.mock('src/app/settings/settings-context', () => ({
	SettingsContext: {
		getInstance: () => ({
			isFFA: () => false,
		}),
	},
}));

vi.mock('src/app/managers/ally-color-filter-manager', () => ({
	AllyColorFilterManager: {
		getInstance: () => allyColorFilterMock,
	},
}));

import { MinimapIconManager } from 'src/app/managers/minimap-icon-manager';
import { AllyColorState } from 'src/app/managers/alliances/ally-color-state';
import { PlayerManager } from 'src/app/player/player-manager';
import { SharedSlotManager } from 'src/app/game/services/shared-slot-manager';
import { MinimapTrackedList } from 'src/app/utils/minimap-tracked-list-logic';
import { UNIT_TYPE } from 'src/app/utils/unit-types';

describe('MinimapIconManager unit icon colors', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(AllyColorState as any).instance = new AllyColorState({
			loadMode: () => 2,
			saveMode: vi.fn(),
		});

		const localPlayer = Player(0);
		(globalThis as any).GetLocalPlayer = () => localPlayer;
		(globalThis as any).GetAllyColorFilterState = () => 0;
		(globalThis as any).BlzFrameSetTexture = (frame: any, texture: string) => {
			frame.texture = texture;
		};
		(globalThis as any).FRAMEPOINT_CENTER = 'center';
		(globalThis as any).GetHandleId = (h: any) => h?.handleId ?? h ?? 0;

		vi.mocked(PlayerManager.getInstance).mockReturnValue({
			players: new Map([
				[
					localPlayer,
					{
						options: { colorblind: false, colorContrast: false },
						status: { isDead: () => false },
					},
				],
			]),
		} as any);

		vi.mocked(SharedSlotManager.getInstance).mockReturnValue({
			getOwnerOfUnit: (unit: any) => unit.owner,
		} as any);
	});

	it('uses custom ally mode 2 for initial local unit icon color', () => {
		const localPlayer = Player(0);
		const unit = { owner: localPlayer };
		const frame = {};
		const manager = Object.create(MinimapIconManager.prototype);

		(manager as any).COLOR_TEXTURES = [];
		(manager as any).COLOR_TEXTURES[1] = 'blue-texture';
		(manager as any).COLOR_TEXTURES[99] = 'white-texture';
		(manager as any).frameLastTexture = new Map();

		(manager as any).updateUnitIconColor(frame, unit, localPlayer);

		expect((frame as any).texture).toBe('white-texture');
	});

	it('updates previously assigned frame color when frame is recycled for a new unit', () => {
		const localPlayer = Player(0);
		// Assign handle IDs for colors directly to match GetHandleId shim expectations
		const redColor = { handleId: 1 };
		const blueColor = { handleId: 2 };
		const redPlayer = Object.assign(Player(1), { color: redColor });
		const bluePlayer = Object.assign(Player(2), { color: blueColor });

		const unitA = { owner: redPlayer };
		const unitB = { owner: bluePlayer };
		const frame: any = { texture: '' };
		const manager = Object.create(MinimapIconManager.prototype);

		// Bypass ally color mode to force default original player colors branch
		vi.spyOn(AllyColorState.getInstance(), 'getMode').mockReturnValue(0);

		(manager as any).COLOR_TEXTURES = [];
		(manager as any).COLOR_TEXTURES[1] = 'red-texture';
		(manager as any).COLOR_TEXTURES[2] = 'blue-texture';
		(manager as any).frameLastTexture = new Map();

		// Simulate frame being assigned to Unit A (red)
		(manager as any).updateUnitIconColor(frame, unitA, localPlayer);
		expect(frame.texture).toBe('red-texture');
		expect((manager as any).frameLastTexture.get(frame)).toBe('red-texture');

		// Simulating frame being recycled mathematically — same frame object now representing Unit B
		// The mock native engine sets 'texture' property on 'frame'.
		// If caching was by unit, it wouldn't know 'frame' is already displaying 'red-texture', and might skip it
		// if unitB was previously also somehow cached to 'blue-texture'.
		// We'll pre-populate a fictitious unit cache (what the bug used) just to prove our cache key works.
		(manager as any).unitLastTexture = new Map([[unitB, 'blue-texture']]);

		// Before calling update, manually wipe the mock frame's texture so we can detect if BlzFrameSetTexture was genuinely called.
		frame.texture = 'stale-red-texture';

		(manager as any).updateUnitIconColor(frame, unitB, localPlayer);

		// The cache checked the mapped 'frame', saw 'red-texture' != 'blue-texture', and applied the update.
		expect(frame.texture).toBe('blue-texture');
		expect((manager as any).frameLastTexture.get(frame)).toBe('blue-texture');
	});

	it('skips redundant BlzFrameSetTexture calls when frame texture is already correct', () => {
		const localPlayer = Player(0);
		// Force predictable color indices for the NameManager fallback
		const blueColor = { handleId: 2 };
		const bluePlayer = Object.assign(Player(2), { color: blueColor });
		let setTextureCallCount = 0;

		// Bypass ally color mode to force default original player colors branch
		vi.spyOn(AllyColorState.getInstance(), 'getMode').mockReturnValue(0);

		// Override the global mock specifically for this test
		(globalThis as any).BlzFrameSetTexture = (frame: any, texture: string) => {
			frame.texture = texture;
			setTextureCallCount++;
		};

		const unit = { owner: bluePlayer };
		const frame: any = { texture: '' };
		const manager = Object.create(MinimapIconManager.prototype);

		(manager as any).COLOR_TEXTURES = [];
		(manager as any).COLOR_TEXTURES[2] = 'blue-texture';
		(manager as any).frameLastTexture = new Map();

		// First call: Should set the texture
		(manager as any).updateUnitIconColor(frame, unit, localPlayer);
		expect(setTextureCallCount).toBe(1);
		expect(frame.texture).toBe('blue-texture');

		// Second call: Should hit cache and avoid calling the BlzFrameSetTexture
		(manager as any).updateUnitIconColor(frame, unit, localPlayer);
		expect(setTextureCallCount).toBe(1); // Call count didn't increase!
	});

	it('refreshes a visible unloaded shared-slot minimap icon even when its texture cache is stale', () => {
		const observer = Player(23);
		const realOwner = Object.assign(Player(1), { color: 5 });
		const sharedSlot = Object.assign(Player(12), { color: 2 });
		const unit = { owner: sharedSlot, x: 50, y: 50 };
		const frame = { texture: 'teal-texture', visible: false };
		const manager = Object.create(MinimapIconManager.prototype);

		(globalThis as any).GetLocalPlayer = () => observer;
		(globalThis as any).IsPlayerObserver = (player: any) => player === observer;
		(globalThis as any).IsUnitVisible = () => true;
		(globalThis as any).UnitAlive = () => true;
		(globalThis as any).IsUnitType = (_unit: any, unitType: any) => unitType === UNIT_TYPE.SPAWN;
		(globalThis as any).GetOwningPlayer = (u: any) => u.owner;
		(globalThis as any).GetUnitX = (u: any) => u.x;
		(globalThis as any).GetUnitY = (u: any) => u.y;
		(globalThis as any).BlzFrameSetAbsPoint = () => {};
		(globalThis as any).BlzFrameSetVisible = (targetFrame: any, isVisible: boolean) => {
			targetFrame.visible = isVisible;
		};

		vi.mocked(PlayerManager.getInstance).mockReturnValue({
			players: new Map(),
		} as any);
		vi.mocked(SharedSlotManager.getInstance).mockReturnValue({
			getOwnerOfUnit: (u: any) => (u.owner === sharedSlot ? realOwner : u.owner),
		} as any);

		(manager as any).isActive = true;
		(manager as any).cityIcons = new Map();
		(manager as any).trackedList = new MinimapTrackedList();
		(manager as any).trackedList.addTrackedUnit(unit, frame, sharedSlot);
		(manager as any).COLOR_TEXTURES = [];
		(manager as any).COLOR_TEXTURES[5] = 'orange-owner-texture';
		(manager as any).frameLastTexture = new Map([[frame, 'orange-owner-texture']]);
		(manager as any).hudScale = 1;
		(manager as any).MINIMAP_WIDTH = 0.14;
		(manager as any).MINIMAP_HEIGHT = 0.14;
		(manager as any).worldMinX = 0;
		(manager as any).worldMinY = 0;
		(manager as any).worldWidth = 100;
		(manager as any).worldHeight = 100;

		(manager as any).registerIfValid(unit, true);

		expect(frame.texture).toBe('orange-owner-texture');
		expect(frame.visible).toBe(true);
		expect((manager as any).trackedList.trackedRawOwnerList[0]).toBe(sharedSlot);
	});

	it('marks visible cities as seen for fogged ally-color refreshes', () => {
		const localPlayer = Player(0);
		const enemyPlayer = Object.assign(Player(1), { color: 1 });
		const city = {
			getOwner: () => enemyPlayer,
			barrack: { unit: { owner: enemyPlayer } },
			cop: { owner: enemyPlayer },
			guard: { unit: { owner: enemyPlayer } },
		};
		const frame: any = {};
		const manager = Object.create(MinimapIconManager.prototype);

		(globalThis as any).GetLocalPlayer = () => localPlayer;
		(globalThis as any).IsPlayerAlly = () => false;
		(globalThis as any).IsPlayerEnemy = () => true;

		(manager as any).COLOR_TEXTURES = [];
		(manager as any).COLOR_TEXTURES[0] = 'red-texture';
		(manager as any).cityLastTexture = new Map();
		(manager as any).lastSeenOwners = new Map();

		(manager as any).updateCityIconColorFast(frame, city, true, localPlayer, localPlayer, 2, false, false);

		expect(allyColorFilterMock.markCitySeen).toHaveBeenCalledWith(city);
	});

	it('clears ally-color seen city cache when minimap seen cache is cleared', () => {
		const manager = Object.create(MinimapIconManager.prototype);
		(manager as any).lastSeenOwners = new Map([[{}, Player(1)]]);

		manager.clearSeenCache();

		expect(allyColorFilterMock.clearSeenCityCache).toHaveBeenCalled();
		expect((manager as any).lastSeenOwners.size).toBe(0);
	});

	it('scales regular and capital city indicator frames when the preference is enabled', () => {
		const localPlayer = Player(0);
		const regularCity = {};
		const capitalCity = {};
		const regularFrame: any = {};
		const capitalFrame: any = {};
		const innerBorder: any = {};
		const outerBorder: any = {};
		const manager = Object.create(MinimapIconManager.prototype);

		(globalThis as any).GetLocalPlayer = () => localPlayer;
		(globalThis as any).BlzFrameSetSize = (frame: any, width: number, height: number) => {
			frame.width = width;
			frame.height = height;
		};
		vi.mocked(PlayerManager.getInstance).mockReturnValue({
			players: new Map([[localPlayer, { options: { largeCityIndicators: true } }]]),
		} as any);

		(manager as any).isActive = true;
		(manager as any).BUILDING_ICON_SIZE = 0.004;
		(manager as any).CAPITAL_ICON_SIZE = 0.0025;
		(manager as any).CAPITAL_BORDER_INNER = 0.0035;
		(manager as any).CAPITAL_BORDER_OUTER = 0.0045;
		(manager as any).LARGE_CITY_INDICATOR_SCALE = 1.35;
		(manager as any).cityRecords = [
			{ city: regularCity, iconFrame: regularFrame },
			{ city: capitalCity, iconFrame: capitalFrame },
		];
		(manager as any).capitalIcons = new Map([[capitalCity, true]]);
		(manager as any).cityBorders = new Map([[capitalCity, innerBorder]]);
		(manager as any).cityOuterBorders = new Map([[capitalCity, outerBorder]]);

		(manager as any).refreshCitySizes();

		expect(regularFrame.width).toBeCloseTo(0.004 * 1.35);
		expect(capitalFrame.width).toBeCloseTo(0.0025 * 1.35);
		expect(innerBorder.width).toBeCloseTo(0.0035 * 1.35);
		expect(outerBorder.width).toBeCloseTo(0.0045 * 1.35);
		expect((manager as any).lastGlobalLargeCityIndicators).toBe(true);
	});
});
