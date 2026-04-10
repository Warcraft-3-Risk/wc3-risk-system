/**
 * Integration tests for the WC3 object data testing infrastructure.
 *
 * These tests prove that:
 * 1. `war3-objectdata-th` can read the exploded map's `.w3u` file
 * 2. Parsed unit data matches the known custom IDs from `src/configs/unit-id.ts`
 * 3. `createFakeUnit` / `createFakePlayer` produce stubs with real stats
 * 4. The WC3 global shim lets game-style API calls work on fakes
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { loadMapObjectData, getMapUnitIds, createFakeUnit, createFakePlayer, fourCCToInt } from './fixtures';
import type { FakeUnitHandle, FakePlayerHandle } from './fixtures';
import type { ObjectData } from 'war3-objectdata-th';

// Install WC3 global shim so we can test shim functions
import './fixtures/wc3-shim';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('Object Data Loader', () => {
	let objectData: ObjectData;

	beforeAll(() => {
		objectData = loadMapObjectData();
	});

	it('should load unit data from the map', () => {
		expect(Object.keys(objectData.units.map).length).toBeGreaterThan(0);
	});

	it('should contain known custom unit IDs', () => {
		const ids = getMapUnitIds();
		// These are defined in src/configs/unit-id.ts
		expect(ids).toContain('h000'); // CITY
		expect(ids).toContain('u000'); // RIFLEMEN
		expect(ids).toContain('s000'); // TRANSPORT_SHIP
		expect(ids).toContain('H000'); // PLAYER_TOOLS
		expect(ids).toContain('h004'); // SPAWNER
	});

	it('should return cached instance on second call', () => {
		const second = loadMapObjectData();
		expect(second).toBe(objectData);
	});
});

describe('Unit Data Accuracy', () => {
	let objectData: ObjectData;

	beforeAll(() => {
		objectData = loadMapObjectData();
	});

	it('Rifleman (u000) should have correct stats', () => {
		const rifleman = objectData.units.get('u000');
		expect(rifleman).toBeDefined();
		expect(rifleman!.name).toBe('Rifleman');
		expect(rifleman!.hitPointsMaximumBase).toBe(200);
		expect(rifleman!.attack1DamageBase).toBe(19);
		expect(rifleman!.speedBase).toBe(270);
	});

	it('City (h000) should be a structure with high HP', () => {
		const city = objectData.units.get('h000');
		expect(city).toBeDefined();
		expect(city!.hitPointsMaximumBase).toBe(1500);
	});

	it('Transport Ship (s000) should exist', () => {
		const transport = objectData.units.get('s000');
		expect(transport).toBeDefined();
		expect(transport!.hitPointsMaximumBase).toBeGreaterThan(0);
	});

	it('Knight (u004) should have high HP and attack', () => {
		const knight = objectData.units.get('u004');
		expect(knight).toBeDefined();
		expect(knight!.hitPointsMaximumBase).toBe(900);
		expect(knight!.attack1DamageBase).toBe(42);
	});

	it('Tank (u007) should be the strongest land unit', () => {
		const tank = objectData.units.get('u007');
		expect(tank).toBeDefined();
		expect(tank!.hitPointsMaximumBase).toBe(2600);
	});
});

describe('FourCC conversion', () => {
	it('should convert 4-char strings to integers', () => {
		// Known FourCC values can be verified against the WC3 engine
		const result = fourCCToInt('u000');
		expect(result).toBeGreaterThan(0);
		expect(typeof result).toBe('number');
	});

	it('should produce different values for different IDs', () => {
		expect(fourCCToInt('u000')).not.toBe(fourCCToInt('u001'));
		expect(fourCCToInt('h000')).not.toBe(fourCCToInt('u000'));
	});

	it('should match the global FourCC shim', () => {
		const shimFourCC = (globalThis as any).FourCC;
		expect(fourCCToInt('u000')).toBe(shimFourCC('u000'));
		expect(fourCCToInt('H000')).toBe(shimFourCC('H000'));
	});
});

describe('createFakeUnit', () => {
	let objectData: ObjectData;
	let player: FakePlayerHandle;

	beforeAll(() => {
		objectData = loadMapObjectData();
		player = createFakePlayer(0, 'TestPlayer');
	});

	it('should create a unit with stats from object data', () => {
		const riflemanData = objectData.units.get('u000')!;
		const unit = createFakeUnit(riflemanData, player);

		expect(unit.name).toBe('Rifleman');
		expect(unit.maxHp).toBe(200);
		expect(unit.hp).toBe(200);
		expect(unit.defense).toBe(0);
		expect(unit.attackDamage).toBe(19);
		expect(unit.moveSpeed).toBe(270);
		expect(unit.alive).toBe(true);
	});

	it('should set the correct owner', () => {
		const riflemanData = objectData.units.get('u000')!;
		const unit = createFakeUnit(riflemanData, player);
		expect(unit.owner).toBe(player);
		expect(unit.owner.name).toBe('TestPlayer');
	});

	it('should compute typeId from rawcode', () => {
		const riflemanData = objectData.units.get('u000')!;
		const unit = createFakeUnit(riflemanData, player);
		expect(unit.typeId).toBe(fourCCToInt('u000'));
		expect(unit.rawcode).toBe('u000');
	});

	it('should accept overrides', () => {
		const riflemanData = objectData.units.get('u000')!;
		const unit = createFakeUnit(riflemanData, player, { x: 100, y: 200, hp: 50 });
		expect(unit.x).toBe(100);
		expect(unit.y).toBe(200);
		expect(unit.hp).toBe(50);
		// Non-overridden values still come from object data
		expect(unit.maxHp).toBe(200);
	});
});

describe('createFakePlayer', () => {
	it('should create a player with given id and name', () => {
		const p = createFakePlayer(2, 'Bob');
		expect(p.id).toBe(2);
		expect(p.name).toBe('Bob');
	});

	it('should use a default name when none is provided', () => {
		const p = createFakePlayer(5);
		expect(p.name).toBe('Player 6');
	});

	it('should default to playing/user state', () => {
		const p = createFakePlayer(0);
		expect(p.slotState).toBe('playing');
		expect(p.controller).toBe('user');
		expect(p.gold).toBe(0);
	});
});

describe('WC3 Global Shim', () => {
	let unit: FakeUnitHandle;
	let player: FakePlayerHandle;

	beforeAll(() => {
		const objectData = loadMapObjectData();
		player = createFakePlayer(3, 'ShimTest');
		unit = createFakeUnit(objectData.units.get('u000')!, player);
	});

	it('GetUnitName should return unit name', () => {
		expect((globalThis as any).GetUnitName(unit)).toBe('Rifleman');
	});

	it('GetUnitTypeId should return typeId', () => {
		expect((globalThis as any).GetUnitTypeId(unit)).toBe(fourCCToInt('u000'));
	});

	it('GetPlayerId / GetPlayerName should work on fake player', () => {
		expect((globalThis as any).GetPlayerId(player)).toBe(3);
		expect((globalThis as any).GetPlayerName(player)).toBe('ShimTest');
	});

	it('GetOwningPlayer should return the unit owner', () => {
		expect((globalThis as any).GetOwningPlayer(unit)).toBe(player);
	});

	it('SetUnitOwner should transfer ownership', () => {
		const newOwner = createFakePlayer(7, 'NewOwner');
		(globalThis as any).SetUnitOwner(unit, newOwner, true);
		expect(unit.owner).toBe(newOwner);
		// Restore
		(globalThis as any).SetUnitOwner(unit, player, true);
	});

	it('SetWidgetLife should update HP and alive status', () => {
		(globalThis as any).SetWidgetLife(unit, 0);
		expect(unit.alive).toBe(false);
		expect(unit.hp).toBe(0);
		// Restore
		(globalThis as any).SetWidgetLife(unit, 200);
		expect(unit.alive).toBe(true);
	});

	it('FourCC shim should match fourCCToInt', () => {
		expect((globalThis as any).FourCC('h000')).toBe(fourCCToInt('h000'));
	});

	it('Player() shim should return consistent objects', () => {
		const p1 = (globalThis as any).Player(10);
		const p2 = (globalThis as any).Player(10);
		expect(p1).toBe(p2);
		expect(p1.id).toBe(10);
	});
});
