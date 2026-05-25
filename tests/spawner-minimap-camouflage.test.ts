import { beforeEach, describe, expect, it, vi } from 'vitest';
import './fixtures/wc3-shim';
import { UNIT_ID } from '../src/configs/unit-id';

vi.mock('../src/app/game/services/shared-slot-manager', () => ({
	SharedSlotManager: {
		getInstance: () => ({
			getOwner: (player: player) => player,
			getOwnerOfUnit: (unit: TestUnit) => unit.owner,
		}),
	},
}));

vi.mock('../src/app/game/services/unit-lag-manager', () => ({
	UnitLagManager: {
		getInstance: () => ({
			trackUnit: vi.fn(),
		}),
	},
}));

vi.mock('../src/app/game/state/global-game-state', () => ({
	GlobalGameData: {
		matchState: 'inProgress',
		matchPlayers: [],
	},
}));

vi.mock('../src/app/utils/debug-print', () => ({
	debugPrint: vi.fn(),
}));

vi.mock('../src/app/utils/unit-types', () => ({
	UNIT_TYPE: {
		SPAWN: 'spawn',
		TRANSPORT: 'transport',
	},
}));

vi.mock('../src/app/player/player-manager', () => ({
	PlayerManager: {
		getInstance: () => ({
			players: new Map(),
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

vi.mock('../src/app/managers/minimap-icon-manager', () => ({
	MinimapIconManager: {
		getInstance: () => ({
			registerIfValid: vi.fn(),
		}),
	},
}));

vi.mock('../src/app/managers/ally-color-filter-manager', () => ({
	AllyColorFilterManager: {
		getInstance: () => ({
			applyColorFilter: vi.fn(),
		}),
	},
}));

type TestUnit = {
	typeId: number;
	name: string;
	owner: player;
	x: number;
	y: number;
	visibleTo: Set<player>;
	booleanFields: Map<unknown, boolean>;
	vertexColor: [number, number, number, number];
	animation?: string;
};

const calls: string[] = [];
let localPlayer: player;
let neutralHostile: player;

function makeCampfire(owner: player = neutralHostile): TestUnit {
	return {
		typeId: UNIT_ID.SPAWNER,
		name: 'Campfire',
		owner,
		x: 100,
		y: 200,
		visibleTo: new Set<player>(),
		booleanFields: new Map<unknown, boolean>(),
		vertexColor: [255, 255, 255, 255],
	};
}

describe('Spawner minimap camouflage', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		calls.length = 0;
		neutralHostile = Player(PLAYER_NEUTRAL_AGGRESSIVE);
		localPlayer = Player(0);

		vi.stubGlobal('UNIT_BF_HIDE_MINIMAP_DISPLAY', 'hide_minimap');
		vi.stubGlobal('UNIT_BF_USE_EXTENDED_LINE_OF_SIGHT', 'extended_los');
		vi.stubGlobal('GetLocalPlayer', () => localPlayer);
		vi.stubGlobal('IsUnitVisible', (unit: TestUnit, player: player) => unit.visibleTo.has(player));
		vi.stubGlobal('BlzSetUnitBooleanField', (unit: TestUnit, field: unknown, value: boolean) => {
			unit.booleanFields.set(field, value);
			calls.push(`boolean:${String(field)}:${value}`);
			return true;
		});
		vi.stubGlobal('SetUnitVertexColor', (unit: TestUnit, red: number, green: number, blue: number, alpha: number) => {
			unit.vertexColor = [red, green, blue, alpha];
			calls.push(`vertex:${red},${green},${blue},${alpha}`);
		});
		vi.stubGlobal('SetUnitOwner', (unit: TestUnit, owner: player) => {
			unit.owner = owner;
			calls.push(`owner:${GetPlayerId(owner)}`);
		});
		vi.stubGlobal('BlzSetUnitName', (unit: TestUnit, name: string) => {
			unit.name = name;
		});
		vi.stubGlobal('SetUnitAnimation', (unit: TestUnit, animation: string) => {
			unit.animation = animation;
		});
		vi.stubGlobal('IssuePointOrder', () => true);
		vi.stubGlobal('SetUnitPathing', () => true);
	});

	it('keeps real WC3 ownership when a fogged country capture hides the native marker', async () => {
		const { Spawner } = await import('../src/app/spawner/spawner');
		const owner = Player(1);
		const enemyViewer = Player(2);
		const campfire = makeCampfire();
		const spawner = new Spawner(campfire as unit, 'Denmark', 1, 5, UNIT_ID.RIFLEMEN, 1);

		localPlayer = enemyViewer;
		spawner.HideMinimap();
		calls.length = 0;

		spawner.setOwner(owner);

		expect(campfire.owner).toBe(owner);
		expect(spawner.getOwner()).toBe(owner);
		expect(campfire.booleanFields.get('hide_minimap')).toBe(true);
		expect(campfire.vertexColor).toEqual([0, 0, 0, 255]);

		const firstBlackCamouflage = calls.indexOf('vertex:0,0,0,255');
		const ownershipTransfer = calls.indexOf(`owner:${GetPlayerId(owner)}`);
		expect(firstBlackCamouflage).toBeGreaterThanOrEqual(0);
		expect(ownershipTransfer).toBeGreaterThan(firstBlackCamouflage);
	});

	it('restores the world model locally when the owned campfire is visible', async () => {
		const { Spawner } = await import('../src/app/spawner/spawner');
		const owner = Player(1);
		const campfire = makeCampfire();
		const spawner = new Spawner(campfire as unit, 'Denmark', 1, 5, UNIT_ID.RIFLEMEN, 1);

		localPlayer = Player(2);
		spawner.HideMinimap();
		spawner.setOwner(owner);

		localPlayer = owner;
		campfire.visibleTo.add(owner);
		spawner.refreshMinimapCamouflage();

		expect(campfire.owner).toBe(owner);
		expect(campfire.booleanFields.get('hide_minimap')).toBe(true);
		expect(campfire.vertexColor).toEqual([255, 255, 255, 255]);
	});
});
