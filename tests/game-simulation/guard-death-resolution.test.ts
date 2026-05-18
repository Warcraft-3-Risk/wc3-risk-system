import { beforeEach, describe, expect, it, vi } from 'vitest';
import './helpers/wc3-integration-shim';
import { resetAllSingletons, createFakeActivePlayer, setupPlayerManager } from './helpers/setup';
import { UnitToCity } from 'src/app/city/city-map';
import { SharedSlotManager } from 'src/app/game/services/shared-slot-manager';
import { CaptureUnitDeathContext } from 'src/app/triggers/unit_death/unit-death-context';
import { InvalidGuardHandler } from 'src/app/triggers/unit_death/invalid-guard-handler';
import { EnemyKillHandler } from 'src/app/triggers/unit_death/enemy-kill-handler';
import { UNIT_ID } from 'src/configs/unit-id';

vi.mock('w3ts', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));
vi.mock('w3ts/system/file', () => ({
	File: { read: vi.fn(() => ''), write: vi.fn() },
}));
vi.mock('src/app/managers/ally-color-filter-manager', () => ({
	AllyColorFilterManager: {
		getInstance: () => ({
			applyColorFilter: vi.fn(),
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

interface TestUnit {
	owner: player;
	affiliation?: player;
	typeId?: number;
	x?: number;
	y?: number;
	alive?: boolean;
	pointValue?: number;
	life?: number;
	loaded?: boolean;
}

interface TestGroup {
	units: TestUnit[];
}

type TestGlobals = typeof globalThis & {
	GetOwningPlayer: (unit: TestUnit) => player;
	GetUnitTypeId: (unit: TestUnit) => number;
	GetUnitX: (unit: TestUnit) => number;
	GetUnitY: (unit: TestUnit) => number;
	GetUnitPointValue: (unit: TestUnit) => number;
	GetUnitState: (unit: TestUnit, state: unknown) => number;
	IsUnitType: (unit: TestUnit, unitType: unknown) => boolean;
	IsUnitAlly: (unit: TestUnit, player: player) => boolean;
	IsUnitEnemy: (unit: TestUnit, player: player) => boolean;
	IsPlayerEnemy: (left: player, right: player) => boolean;
	UnitAlive: (unit: TestUnit) => boolean;
	IsUnitLoaded: (unit: TestUnit) => boolean;
	CreateUnit: (owner: player, typeId: number, x: number, y: number, facing: number) => TestUnit;
	CreateGroup: () => TestGroup;
	GroupEnumUnitsInRange: (group: TestGroup, x: number, y: number, radius: number, filter: () => boolean) => void;
	BlzGroupGetSize: (group: TestGroup) => number;
	DestroyGroup: (group: TestGroup) => void;
	GroupPickRandomUnit: (group: TestGroup) => TestUnit;
	ForGroup: (group: TestGroup, callback: () => void) => void;
	GetFilterUnit: () => TestUnit;
	GetEnumUnit: () => TestUnit;
};

function makeUnit(owner: player, typeId = 1, affiliation = owner): TestUnit {
	return {
		owner,
		affiliation,
		typeId,
		x: 0,
		y: 0,
		alive: true,
		pointValue: 1,
		life: 100,
	};
}

function makeCity(owner: player, guardUnit: TestUnit) {
	const city = {
		owner,
		guard: {
			unit: guardUnit,
			defaultX: 128,
			defaultY: 256,
			replace: vi.fn((newGuard: TestUnit) => {
				city.guard.unit = newGuard;
			}),
		},
		isPort: () => false,
		isValidGuard: (unit: TestUnit) => unit !== city.guard.unit && unit.alive !== false && !unit.loaded,
		getOwner: () => city.owner,
		changeOwner: vi.fn((newOwner: player) => {
			city.owner = newOwner;
		}),
	};

	return city;
}

describe('guard death resolution', () => {
	let availableUnits: TestUnit[];
	let currentFilterUnit: TestUnit;
	let currentEnumUnit: TestUnit;

	beforeEach(() => {
		resetAllSingletons();
		SharedSlotManager.resetInstance();
		UnitToCity.clear();
		availableUnits = [];

		const wc3 = globalThis as TestGlobals;
		wc3.GetOwningPlayer = (unit: TestUnit) => unit.owner;
		wc3.GetUnitTypeId = (unit: TestUnit) => unit.typeId ?? 1;
		wc3.GetUnitX = (unit: TestUnit) => unit.x ?? 0;
		wc3.GetUnitY = (unit: TestUnit) => unit.y ?? 0;
		wc3.GetUnitPointValue = (unit: TestUnit) => unit.pointValue ?? 1;
		wc3.GetUnitState = (unit: TestUnit) => unit.life ?? 100;
		wc3.IsUnitType = (unit: TestUnit, unitType: unknown) => unit.typeId === unitType;
		wc3.IsUnitAlly = (unit: TestUnit, player: player) => unit.affiliation === player || unit.owner === player;
		wc3.IsUnitEnemy = (unit: TestUnit, player: player) => !wc3.IsUnitAlly(unit, player);
		wc3.IsPlayerEnemy = (left: player, right: player) => left !== right;
		wc3.UnitAlive = (unit: TestUnit) => unit.alive !== false;
		wc3.IsUnitLoaded = (unit: TestUnit) => unit.loaded === true;
		wc3.CreateGroup = () => ({ units: [] });
		wc3.GroupEnumUnitsInRange = (group: TestGroup, _x: number, _y: number, _radius: number, filter: () => boolean) => {
			availableUnits.forEach((unit) => {
				currentFilterUnit = unit;
				if (filter()) group.units.push(unit);
			});
		};
		wc3.BlzGroupGetSize = (group: TestGroup) => group.units.length;
		wc3.DestroyGroup = (group: TestGroup) => {
			group.units.length = 0;
		};
		wc3.GroupPickRandomUnit = (group: TestGroup) => group.units[0];
		wc3.ForGroup = (group: TestGroup, callback: () => void) => {
			group.units.forEach((unit) => {
				currentEnumUnit = unit;
				callback();
			});
		};
		wc3.GetFilterUnit = () => currentFilterUnit;
		wc3.GetEnumUnit = () => currentEnumUnit;
	});

	it('uses the captured attacker owner when a shared slot is freed before fallback guard creation', () => {
		const defender = createFakeActivePlayer(0);
		const attacker = createFakeActivePlayer(1);
		setupPlayerManager([defender, attacker]);

		const attackerSharedSlot = Player(12);
		const sharedSlotManager = SharedSlotManager.getInstance() as unknown as {
			slotToPlayer: Map<player, player>;
		};
		sharedSlotManager.slotToPlayer.set(attackerSharedSlot, attacker.getPlayer());

		const deadGuard = makeUnit(defender.getPlayer());
		const killingUnit = makeUnit(attackerSharedSlot);
		const deathContext = CaptureUnitDeathContext(deadGuard as unit, killingUnit as unit);

		sharedSlotManager.slotToPlayer.delete(attackerSharedSlot);

		const createdUnits: TestUnit[] = [];
		const wc3 = globalThis as TestGlobals;
		wc3.CreateUnit = (owner: player, typeId: number, x: number, y: number, _facing: number) => {
			const unit = { owner, typeId, x, y, alive: true };
			createdUnits.push(unit);
			return unit;
		};

		const city = makeCity(defender.getPlayer(), deadGuard);

		InvalidGuardHandler(city as unknown as Parameters<typeof InvalidGuardHandler>[0], deathContext);

		expect(createdUnits).toHaveLength(1);
		expect(createdUnits[0].owner).toBe(attacker.getPlayer());
		expect(createdUnits[0].typeId).toBe(UNIT_ID.DUMMY_GUARD);
		expect(city.changeOwner).toHaveBeenCalledWith(attacker.getPlayer());
		expect(city.guard.replace).toHaveBeenCalledWith(createdUnits[0]);
		expect(UnitToCity.get(createdUnits[0] as unit)).toBe(city);
	});

	it('uses the captured attacker owner to find attacker-affiliated guard candidates after the killer slot is freed', () => {
		const defender = createFakeActivePlayer(0);
		const attacker = createFakeActivePlayer(1);
		setupPlayerManager([defender, attacker]);

		const attackerKillerSlot = Player(12);
		const sharedSlotManager = SharedSlotManager.getInstance() as unknown as {
			slotToPlayer: Map<player, player>;
		};
		sharedSlotManager.slotToPlayer.set(attackerKillerSlot, attacker.getPlayer());

		const deadGuard = makeUnit(defender.getPlayer());
		const killingUnit = makeUnit(attackerKillerSlot, 1, attacker.getPlayer());
		const attackerCandidate = makeUnit(attacker.getPlayer(), 1, attacker.getPlayer());
		availableUnits = [attackerCandidate];

		const deathContext = CaptureUnitDeathContext(deadGuard as unit, killingUnit as unit);
		sharedSlotManager.slotToPlayer.delete(attackerKillerSlot);

		const city = makeCity(defender.getPlayer(), deadGuard);

		const handled = EnemyKillHandler(city as unknown as Parameters<typeof EnemyKillHandler>[0], deathContext);

		expect(handled).toBe(true);
		expect(city.guard.replace).toHaveBeenCalledWith(attackerCandidate);
		expect(city.changeOwner).toHaveBeenCalledWith(attacker.getPlayer());
		expect(UnitToCity.get(attackerCandidate as unit)).toBe(city);
	});
});
