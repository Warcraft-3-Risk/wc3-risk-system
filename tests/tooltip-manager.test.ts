/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import './game-simulation/helpers/wc3-integration-shim';

vi.mock('w3ts', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));
vi.mock('w3ts/system/file', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));

vi.mock('../src/configs/game-settings', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../src/configs/game-settings')>();
	return {
		...actual,
		EDITOR_DEVELOPER_MODE: false,
	};
});

vi.mock('../src/app/managers/names/name-manager', () => {
	return {
		NameManager: {
			getInstance: vi.fn(() => ({
				getDisplayName: vi.fn((p) => p.displayName ?? `Player ${p.id}`),
				getOriginalColor: vi.fn((p) => p.originalColor ?? p.color ?? p.id ?? 0),
			})),
		},
	};
});

import { TooltipManager } from '../src/app/managers/tooltip-manager';
import { AllyColorFilterManager } from '../src/app/managers/ally-color-filter-manager';
import { AllyColorState } from '../src/app/managers/alliances/ally-color-state';
import { PlayerManager } from '../src/app/player/player-manager';
import { SharedSlotManager } from '../src/app/game/services/shared-slot-manager';

describe('TooltipManager', () => {
	let localPlayer: any;
	let allyPlayer: any;
	let frameTexts: string[];

	beforeEach(() => {
		vi.clearAllMocks();

		localPlayer = Player(0) as any;
		allyPlayer = Player(1) as any;
		allyPlayer.displayName = '|cFFAABBCCAlly|r';
		frameTexts = [];

		(TooltipManager as any).instance = undefined;
		(AllyColorFilterManager as any).instance = undefined;
		(AllyColorState as any).instance = undefined;
		(SharedSlotManager as any).instance = undefined;

		(globalThis as any).GetLocalPlayer = vi.fn(() => localPlayer);
		(globalThis as any).IsPlayerObserver = vi.fn(() => false);
		(globalThis as any).IsPlayerAlly = vi.fn(
			(a: any, b: any) => a === b || (a === localPlayer && b === allyPlayer) || (a === allyPlayer && b === localPlayer)
		);
		(globalThis as any).ORIGIN_FRAME_UBERTOOLTIP = 1;
		(globalThis as any).FRAMEPOINT_BOTTOMLEFT = 0;
		(globalThis as any).FRAMEPOINT_TOPRIGHT = 1;
		(globalThis as any).BlzFrameSetAllPoints = vi.fn();
		(globalThis as any).BlzFrameSetPoint = vi.fn();
		(globalThis as any).BlzFrameSetAlpha = vi.fn();
		(globalThis as any).BlzFrameSetText = vi.fn((frame: any, text: string) => {
			if (frame) frame.text = text;
			frameTexts.push(text);
		});
		(globalThis as any).BlzGetMouseFocusUnit = vi.fn(() => undefined);
		(globalThis as any).IsUnitVisible = vi.fn(() => true);

		vi.spyOn(PlayerManager, 'getInstance').mockReturnValue({
			players: new Map([
				[localPlayer, { options: { colorblind: false, colorContrast: false } }],
				[allyPlayer, { options: { colorblind: false, colorContrast: false } }],
			]),
			isActive: vi.fn((p: any) => p === localPlayer || p === allyPlayer),
		} as any);

		vi.spyOn(SharedSlotManager.getInstance(), 'canPlayerSeeUnitTooltip').mockReturnValue(false);
		vi.spyOn(SharedSlotManager.getInstance(), 'getOwnerOfUnit').mockImplementation((unit: any) => unit.owner);
	});

	it('recolors player hover tooltips with ally-color mode text colors', () => {
		(AllyColorState as any).instance = new AllyColorState({
			loadMode: () => 2,
			saveMode: vi.fn(),
		});

		const unit = { owner: allyPlayer, name: 'Unit', typeId: 0, x: 0, y: 0 };
		const manager = TooltipManager.getInstance();
		(manager as any).updateTooltip(unit);

		expect(frameTexts.at(-1)).toBe('|cFF00FFFFAlly|r');
	});
});
