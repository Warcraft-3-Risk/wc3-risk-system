/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import './game-simulation/helpers/wc3-integration-shim';

vi.mock('../src/app/ui/player-preference-buttons', () => ({
	buildGuardHealthButton: vi.fn(),
	buildGuardValueButton: vi.fn(),
	buildLabelToggleButton: vi.fn(),
	buildRatingStatsButton: vi.fn(),
	buildColorblindModeButton: vi.fn(),
	buildColorContrastModeButton: vi.fn(),
	buildCameraPanModeButton: vi.fn(),
}));

vi.mock('w3ts', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));
vi.mock('w3ts/system/file', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));

(globalThis as any).MapSetup = vi.fn();
(globalThis as any).ORIGIN_FRAME_GAME_UI = 1;
(globalThis as any).FRAMEPOINT_TOPLEFT = 0;
(globalThis as any).FRAMEEVENT_CONTROL_CLICK = 1;

(globalThis as any).BlzCreateSimpleFrame = vi.fn().mockReturnValue({});
(globalThis as any).BlzCreateFrameByType = vi.fn().mockReturnValue({});
(globalThis as any).BlzCreateFrame = vi.fn().mockReturnValue({});
(globalThis as any).BlzFrameSetTooltip = vi.fn();
(globalThis as any).BlzFrameSetAllPoints = vi.fn();
(globalThis as any).BlzFrameSetTextAlignment = vi.fn();
(globalThis as any).BlzFrameSetTexture = vi.fn();
(globalThis as any).BlzFrameSetEnable = vi.fn();
(globalThis as any).BlzTriggerRegisterPlayerKeyEvent = vi.fn();
(globalThis as any).BlzFrameSetValue = vi.fn();
(globalThis as any).BlzFrameSetText = vi.fn();
(globalThis as any).BlzFrameSetVisible = vi.fn();
(globalThis as any).BlzFrameSetPoint = vi.fn();
(globalThis as any).BlzFrameSetSize = vi.fn();
(globalThis as any).BlzGetFrameByName = vi.fn().mockReturnValue({});
(globalThis as any).BlzGetOriginFrame = vi.fn().mockReturnValue({});
(globalThis as any).BlzTriggerRegisterFrameEvent = vi.fn();
(globalThis as any).CreateTrigger = vi.fn().mockReturnValue({});
(globalThis as any).TriggerAddAction = vi.fn();
(globalThis as any).TriggerAddCondition = vi.fn();
(globalThis as any).Condition = vi.fn((cb) => cb);
(globalThis as any).CustomDefeatBJ = vi.fn();
(globalThis as any).ClearTextMessages = vi.fn();
(globalThis as any).OSKEY_F2 = 2;
(globalThis as any).OSKEY_F3 = 3;
(globalThis as any).OSKEY_F4 = 4;
(globalThis as any).OSKEY_F5 = 5;
(globalThis as any).OSKEY_F6 = 6;
(globalThis as any).OSKEY_F7 = 7;
(globalThis as any).OSKEY_F8 = 8;
(globalThis as any).OSKEY_F9 = 9;
(globalThis as any).OSKEY_F10 = 10;
(globalThis as any).OSKEY_F11 = 11;
(globalThis as any).OSKEY_F12 = 12;
(globalThis as any).TEXT_JUSTIFY_LEFT = 1;
(globalThis as any).TEXT_JUSTIFY_TOP = 2;
(globalThis as any).TEXT_JUSTIFY_BOTTOM = 3;
(globalThis as any).TEXT_JUSTIFY_RIGHT = 4;
(globalThis as any).FRAMEPOINT_BOTTOMLEFT = 1;
(globalThis as any).FRAMEPOINT_TOPRIGHT = 2;
(globalThis as any).GetPlayerId = vi.fn((p) => p.id);

// Mock configs
vi.mock('../src/configs/game-settings', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../src/configs/game-settings')>();
	return {
		...actual,
		EDITOR_DEVELOPER_MODE: true,
		DEV_MODE_COMPUTER_PLAYERS: 4,
	};
});

// Mock NameManager
vi.mock('../src/app/managers/names/name-manager', () => {
	return {
		NameManager: {
			getInstance: vi.fn(() => ({
				getDisplayName: vi.fn((p) => `Player ${p.id}`),
				getBtag: vi.fn(() => `Player#1234`),
			})),
		},
	};
});

import { PlayerManager } from '../src/app/player/player-manager';
import { ComputerPlayer } from '../src/app/player/types/computer-player';
import { HumanPlayer } from '../src/app/player/types/human-player';

describe('PlayerManager - Developer Mode Computers', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		(globalThis as any).Player = vi.fn((i: number) => ({ id: i }));
		(globalThis as any).GetLocalPlayer = vi.fn().mockReturnValue({ id: 0 });
		(globalThis as any).bj_MAX_PLAYERS = 24;

		(globalThis as any).IsPlayerObserver = vi.fn(() => false);

		// Simulate standard case: slots 0 is user, remaining space is empty.
		(globalThis as any).GetPlayerController = vi.fn((p: any) => {
			if (p.id === 0) return (globalThis as any).MAP_CONTROL_USER;
			return (globalThis as any).MAP_CONTROL_NONE;
		});

		(globalThis as any).GetPlayerSlotState = vi.fn((p: any) => {
			if (p.id === 0) return (globalThis as any).PLAYER_SLOT_STATE_PLAYING;
			return (globalThis as any).PLAYER_SLOT_STATE_EMPTY;
		});

		// Rest the singleton explicitly for test
		(PlayerManager as any)._instance = undefined;
	});

	it('should add exactly DEV_MODE_COMPUTER_PLAYERS empty slots as ComputerPlayers when EDITOR_DEVELOPER_MODE is true', () => {
		const manager = PlayerManager.getInstance();

		let humanCount = 0;
		let computerCount = 0;

		manager.playersAndObservers.forEach((player) => {
			if (player instanceof HumanPlayer) humanCount++;
			if (player instanceof ComputerPlayer) computerCount++;
		});

		// Expected: 1 human player (id 0) and 4 computers dynamically injected into empty slots
		expect(humanCount).toBe(1);
		expect(computerCount).toBe(4);
	});
});
