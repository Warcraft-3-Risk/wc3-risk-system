/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import './helpers/wc3-integration-shim';

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
		getInstance: () => ({
			applyColorFilter: vi.fn(),
		}),
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
		(manager as any).unitLastTexture = new Map();

		(manager as any).updateUnitIconColor(frame, unit, localPlayer);

		expect((frame as any).texture).toBe('blue-texture');
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
		(manager as any).unitLastTexture = new Map([[unit, 'orange-owner-texture']]);
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
});
