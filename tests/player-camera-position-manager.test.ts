/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import './game-simulation/helpers/wc3-integration-shim';

vi.mock('w3ts', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));
vi.mock('w3ts/system/file', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));

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

// Mock MinimapIconManager
vi.mock('../src/app/managers/minimap-icon-manager', () => {
	return {
		MinimapIconManager: {
			getInstance: vi.fn(() => ({
				updateIconPosition: vi.fn(),
			})),
		},
	};
});

import PlayerCameraPositionManager from '../src/app/managers/player-camera-position-manager';
import { PlayerManager } from '../src/app/player/player-manager';
import { PLAYER_STATUS } from '../src/app/player/status/status-enum';
import { ObserverCameraPositionOverlay } from '../src/app/triggers/visuals/observer-camera-position-overlay';

// Setup some missing specific globals for player camera manager
(globalThis as any).CreateTrigger = vi.fn().mockReturnValue({});
(globalThis as any).BlzTriggerRegisterPlayerSyncEvent = vi.fn();
(globalThis as any).TriggerAddAction = vi.fn();
(globalThis as any).CreateTimer = vi.fn().mockReturnValue({});
(globalThis as any).TimerStart = vi.fn();
(globalThis as any).BlzGetOriginFrame = vi.fn().mockReturnValue({});
(globalThis as any).BlzCreateFrameByType = vi.fn().mockReturnValue({});
(globalThis as any).BlzFrameSetPoint = vi.fn();
(globalThis as any).BlzFrameSetSize = vi.fn();
(globalThis as any).BlzFrameSetText = vi.fn();
(globalThis as any).BlzFrameSetVisible = vi.fn();
(globalThis as any).BlzFrameSetEnable = vi.fn();
(globalThis as any).BlzFrameSetAlpha = vi.fn();
(globalThis as any).BlzFrameSetAbsPoint = vi.fn();
(globalThis as any).GetCameraTargetPositionX = vi.fn().mockReturnValue(100);
(globalThis as any).GetCameraTargetPositionY = vi.fn().mockReturnValue(200);
(globalThis as any).BlzSendSyncData = vi.fn();
(globalThis as any).MapSetup = vi.fn();
(globalThis as any).ORIGIN_FRAME_GAME_UI = 1;
(globalThis as any).FRAMEPOINT_TOPLEFT = 0;
(globalThis as any).FRAMEEVENT_CONTROL_CLICK = 1;

(globalThis as any).BlzCreateSimpleFrame = vi.fn().mockReturnValue({});
(globalThis as any).BlzCreateFrameByType = vi.fn().mockReturnValue({});
(globalThis as any).BlzFrameSetValue = vi.fn();
(globalThis as any).BlzFrameSetText = vi.fn();
(globalThis as any).BlzFrameSetVisible = vi.fn();
(globalThis as any).BlzFrameSetPoint = vi.fn();
(globalThis as any).BlzFrameSetSize = vi.fn();
(globalThis as any).BlzFrameSetTexture = vi.fn();
(globalThis as any).BlzGetFrameByName = vi.fn().mockReturnValue({});
(globalThis as any).BlzGetOriginFrame = vi.fn().mockReturnValue({});
(globalThis as any).BlzTriggerRegisterFrameEvent = vi.fn();
(globalThis as any).CreateTrigger = vi.fn().mockReturnValue({});
(globalThis as any).TriggerAddAction = vi.fn();

// Mock configs properly
vi.mock('../src/configs/game-settings', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../src/configs/game-settings')>();
	return {
		...actual,
		SHOW_PLAYER_CAMERA_POSITIONS: true,
		EDITOR_DEVELOPER_MODE: false,
	};
});

class MockActivePlayer {
	player: any;
	status: {
		current: string;
		isActive: () => boolean;
	};

	constructor(player: any) {
		this.player = player;
		this.status = {
			current: PLAYER_STATUS.ALIVE,
			isActive: () => this.status.current === PLAYER_STATUS.ALIVE || this.status.current === PLAYER_STATUS.NOMAD,
		};
	}
}

describe('PlayerCameraPositionManager', () => {
	let localPlayer: any;
	let otherPlayer: any;

	beforeEach(() => {
		vi.clearAllMocks();

		localPlayer = { id: 0 };
		otherPlayer = { id: 1 };

		(globalThis as any).Player = vi.fn((i: number) => {
			if (i === 0) return localPlayer;
			if (i === 1) return otherPlayer;
			return { id: i, controller: 'user', slotState: 'playing', name: `Player ${i}`, gold: 0, lumber: 0 };
		});
		(globalThis as any).GetLocalPlayer = vi.fn(() => localPlayer);
		(globalThis as any).GetPlayerController = vi.fn(() => (globalThis as any).MAP_CONTROL_USER);
		(globalThis as any).bj_MAX_PLAYERS = 2; // only 2 players for tests to prevent 22 extra removals
		(globalThis as any).GetCameraTargetPositionX = vi.fn(() => 100);
		(globalThis as any).GetCameraTargetPositionY = vi.fn(() => 200);
		(globalThis as any).BlzSendSyncData = vi.fn();
		(globalThis as any).MAP_CONTROL_USER = 1;
		(globalThis as any).IsPlayerObserver = vi.fn(() => true); // enable overlay triggers

		const playerManager = PlayerManager.getInstance();
		playerManager.players.clear();
		playerManager.observers.set(localPlayer, {} as any); // Required for constructor to fully init

		const mockLocal = new MockActivePlayer(localPlayer);
		const mockOther = new MockActivePlayer(otherPlayer);

		playerManager.players.set(localPlayer, mockLocal as any);
		playerManager.players.set(otherPlayer, mockOther as any);

		// Reset singleton
		(PlayerCameraPositionManager as any).instance = undefined;
		(ObserverCameraPositionOverlay as any).instance = undefined;
	});

	it('syncs camera position when the active player is ALIVE', () => {
		const manager = PlayerCameraPositionManager.getInstance();
		const mockLocal = PlayerManager.getInstance().players.get(localPlayer) as any as MockActivePlayer;
		mockLocal.status.current = PLAYER_STATUS.ALIVE;

		// Directly call the private syncLocalPlayerPosition
		(manager as any).syncLocalPlayerPosition();

		expect(globalThis.BlzSendSyncData).toHaveBeenCalledWith('cam', '100:200');
	});

	it('does NOT sync camera position when the active player is DEAD', () => {
		const manager = PlayerCameraPositionManager.getInstance();

		const mockLocal = PlayerManager.getInstance().players.get(localPlayer) as any as MockActivePlayer;
		mockLocal.status.current = PLAYER_STATUS.DEAD;

		// Directly call the private syncLocalPlayerPosition
		(manager as any).syncLocalPlayerPosition();

		// Since local player is dead, their camera sync data shouldn't be sent.
		expect(globalThis.BlzSendSyncData).not.toHaveBeenCalled();
	});

	it('removes player frames during sync loop if they are no longer active (DEAD)', () => {
		const manager = PlayerCameraPositionManager.getInstance();

		const mockOther = PlayerManager.getInstance().players.get(otherPlayer) as any as MockActivePlayer;
		mockOther.status.current = PLAYER_STATUS.DEAD;

		const removeSpy = vi.spyOn(manager as any, 'removePlayerFrame');

		// Set up dummy frames in the manager for "otherPlayer"
		(manager as any).frames.set(otherPlayer, { box: {}, text: {}, minimapIcon: {} });

		(manager as any).syncLocalPlayerPosition();

		expect(removeSpy).toHaveBeenCalledWith(otherPlayer);
		expect((manager as any).frames.has(otherPlayer)).toBeFalsy();
	});

	it('retains player frames during sync loop if they are active (ALIVE)', () => {
		const manager = PlayerCameraPositionManager.getInstance();

		const mockLocal = PlayerManager.getInstance().players.get(localPlayer) as any as MockActivePlayer;
		mockLocal.status.current = PLAYER_STATUS.ALIVE;
		const mockOther = PlayerManager.getInstance().players.get(otherPlayer) as any as MockActivePlayer;
		mockOther.status.current = PLAYER_STATUS.ALIVE;

		const removeSpy = vi.spyOn(manager as any, 'removePlayerFrame');

		// Set up dummy frames in the manager for "otherPlayer"
		const DUMMY_FRAME = { box: {}, text: {}, minimapIcon: {} };
		(manager as any).frames.set(otherPlayer, DUMMY_FRAME);

		(manager as any).syncLocalPlayerPosition();

		expect(removeSpy).not.toHaveBeenCalledWith(otherPlayer);
		expect((manager as any).frames.has(otherPlayer)).toBeTruthy();
	});
});
