import { beforeEach, describe, expect, it } from 'vitest';
import './helpers/wc3-integration-shim';
import { ShouldCancelCityDamage } from 'src/app/triggers/unit_death/unit-damaged-event';
import { UNIT_TYPE } from 'src/app/utils/unit-types';

interface TestUnit {
	types: Set<unknown>;
}

type TestGlobals = typeof globalThis & {
	IsUnitType: (unit: TestUnit, unitType: unknown) => boolean;
};

function makeUnit(...types: unknown[]): TestUnit {
	return { types: new Set(types) };
}

describe('city damage cancellation', () => {
	beforeEach(() => {
		const wc3 = globalThis as TestGlobals;
		wc3.IsUnitType = (unit: TestUnit, unitType: unknown) => unit.types.has(unitType);
	});

	it('cancels city damage against a unit assigned as guard', () => {
		const city = makeUnit(UNIT_TYPE.CITY);
		const guard = makeUnit(UNIT_TYPE.GUARD);

		expect(ShouldCancelCityDamage(guard as unit, city as unit)).toBe(true);
	});

	it('does not cancel city damage against a non-guard unit', () => {
		const city = makeUnit(UNIT_TYPE.CITY);
		const normalUnit = makeUnit();

		expect(ShouldCancelCityDamage(normalUnit as unit, city as unit)).toBe(false);
	});

	it('does not cancel non-city damage against a guard', () => {
		const attacker = makeUnit();
		const guard = makeUnit(UNIT_TYPE.GUARD);

		expect(ShouldCancelCityDamage(guard as unit, attacker as unit)).toBe(false);
	});
});
