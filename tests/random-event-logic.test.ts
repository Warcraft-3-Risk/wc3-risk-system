import { describe, it, expect, beforeEach, vi } from 'vitest';
import { shouldTriggerEvent, isPreviewTurn, selectEvent } from '../src/app/events/random-event-logic';
import { RandomEvent, EventCategory } from '../src/app/events/random-event';

vi.mock('src/app/utils/messages', () => ({
	GlobalMessage: vi.fn(),
}));

vi.mock('src/app/utils/debug-print', () => ({
	debugPrint: vi.fn(),
}));

import { RandomEventManager } from '../src/app/events/random-event-manager';
import { TradeBoom } from '../src/app/events/events/trade-boom';
import { Famine } from '../src/app/events/events/famine';
import { WarProfiteering } from '../src/app/events/events/war-profiteering';

function makeEvent(id: string, category: EventCategory, eligible = true): RandomEvent {
	return {
		id,
		name: id,
		category,
		duration: 2,
		announce: () => '',
		activate: () => {},
		deactivate: () => {},
		isEligible: () => eligible,
	};
}

describe('shouldTriggerEvent', () => {
	it('returns false for turn 0', () => {
		expect(shouldTriggerEvent(0, 5)).toBe(false);
	});

	it('returns true for multiples of interval', () => {
		expect(shouldTriggerEvent(5, 5)).toBe(true);
		expect(shouldTriggerEvent(10, 5)).toBe(true);
		expect(shouldTriggerEvent(15, 5)).toBe(true);
	});

	it('returns false for non-multiples', () => {
		expect(shouldTriggerEvent(1, 5)).toBe(false);
		expect(shouldTriggerEvent(3, 5)).toBe(false);
		expect(shouldTriggerEvent(7, 5)).toBe(false);
	});
});

describe('isPreviewTurn', () => {
	it('returns true one turn before trigger', () => {
		expect(isPreviewTurn(4, 5)).toBe(true);
		expect(isPreviewTurn(9, 5)).toBe(true);
		expect(isPreviewTurn(14, 5)).toBe(true);
	});

	it('returns false on trigger turn', () => {
		expect(isPreviewTurn(5, 5)).toBe(false);
		expect(isPreviewTurn(10, 5)).toBe(false);
	});

	it('returns false for turn 0', () => {
		expect(isPreviewTurn(0, 5)).toBe(false);
	});
});

describe('selectEvent', () => {
	const economic1 = makeEvent('trade-boom', 'economic');
	const economic2 = makeEvent('famine', 'economic');
	const combat1 = makeEvent('veteran-surge', 'combat');
	const naval1 = makeEvent('calm-seas', 'naval');
	const deterministicRng = (min: number, _max: number) => min;

	it('selects from eligible events', () => {
		const result = selectEvent([economic1, combat1, naval1], [], undefined, deterministicRng);
		expect(result).toBeDefined();
	});

	it('excludes events in recent history', () => {
		const result = selectEvent([economic1, combat1], ['trade-boom'], undefined, deterministicRng);
		expect(result?.id).toBe('veteran-surge');
	});

	it('excludes events matching last category', () => {
		const result = selectEvent([economic1, economic2, combat1], [], 'economic', deterministicRng);
		expect(result?.id).toBe('veteran-surge');
	});

	it('excludes ineligible events', () => {
		const ineligible = makeEvent('blocked', 'combat', false);
		const result = selectEvent([ineligible, economic1], [], undefined, deterministicRng);
		expect(result?.id).toBe('trade-boom');
	});

	it('falls back to ignoring history if all filtered out', () => {
		const result = selectEvent([economic1, combat1], ['trade-boom', 'veteran-surge'], undefined, deterministicRng);
		expect(result).toBeDefined();
	});

	it('returns undefined when pool is empty', () => {
		const result = selectEvent([], [], undefined, deterministicRng);
		expect(result).toBeUndefined();
	});

	it('returns undefined when all events are ineligible', () => {
		const a = makeEvent('a', 'economic', false);
		const b = makeEvent('b', 'combat', false);
		const result = selectEvent([a, b], [], undefined, deterministicRng);
		expect(result).toBeUndefined();
	});

	it('respects both history and category constraints', () => {
		const result = selectEvent([economic1, economic2, combat1, naval1], ['trade-boom'], 'combat', deterministicRng);
		// Should exclude trade-boom (history) and combat1 (category), leaving economic2 and naval1
		expect(['famine', 'calm-seas']).toContain(result?.id);
	});
});

describe('TradeBoom', () => {
	beforeEach(() => {
		RandomEventManager.resetInstance();
	});

	it('has correct metadata', () => {
		const event = new TradeBoom();
		expect(event.id).toBe('trade-boom');
		expect(event.name).toBe('Trade Boom');
		expect(event.category).toBe('economic');
		expect(event.duration).toBe(2);
	});

	it('sets income multiplier to 1.5 on activate', () => {
		const event = new TradeBoom();
		const manager = RandomEventManager.getInstance();

		expect(manager.incomeMultiplier).toBe(1.0);
		event.activate();
		expect(manager.incomeMultiplier).toBe(1.5);
	});

	it('resets income multiplier to 1.0 on deactivate', () => {
		const event = new TradeBoom();
		const manager = RandomEventManager.getInstance();

		event.activate();
		expect(manager.incomeMultiplier).toBe(1.5);
		event.deactivate();
		expect(manager.incomeMultiplier).toBe(1.0);
	});

	it('does not affect bounty multiplier', () => {
		const event = new TradeBoom();
		const manager = RandomEventManager.getInstance();

		event.activate();
		expect(manager.bountyMultiplier).toBe(1.0);
		event.deactivate();
		expect(manager.bountyMultiplier).toBe(1.0);
	});

	it('returns a non-empty announce string', () => {
		const event = new TradeBoom();
		expect(event.announce().length).toBeGreaterThan(0);
	});
});

describe('Famine', () => {
	beforeEach(() => {
		RandomEventManager.resetInstance();
	});

	it('has correct metadata', () => {
		const event = new Famine();
		expect(event.id).toBe('famine');
		expect(event.name).toBe('Famine');
		expect(event.category).toBe('economic');
		expect(event.duration).toBe(2);
	});

	it('sets income multiplier to 0.5 on activate', () => {
		const event = new Famine();
		const manager = RandomEventManager.getInstance();

		expect(manager.incomeMultiplier).toBe(1.0);
		event.activate();
		expect(manager.incomeMultiplier).toBe(0.5);
	});

	it('resets income multiplier to 1.0 on deactivate', () => {
		const event = new Famine();
		const manager = RandomEventManager.getInstance();

		event.activate();
		expect(manager.incomeMultiplier).toBe(0.5);
		event.deactivate();
		expect(manager.incomeMultiplier).toBe(1.0);
	});

	it('does not affect bounty multiplier', () => {
		const event = new Famine();
		const manager = RandomEventManager.getInstance();

		event.activate();
		expect(manager.bountyMultiplier).toBe(1.0);
		event.deactivate();
		expect(manager.bountyMultiplier).toBe(1.0);
	});

	it('returns a non-empty announce string', () => {
		const event = new Famine();
		expect(event.announce().length).toBeGreaterThan(0);
	});
});

describe('WarProfiteering', () => {
	beforeEach(() => {
		RandomEventManager.resetInstance();
	});

	it('has correct metadata', () => {
		const event = new WarProfiteering();
		expect(event.id).toBe('war-profiteering');
		expect(event.name).toBe('War Profiteering');
		expect(event.category).toBe('economic');
		expect(event.duration).toBe(2);
	});

	it('sets bounty multiplier to 2.0 on activate', () => {
		const event = new WarProfiteering();
		const manager = RandomEventManager.getInstance();

		expect(manager.bountyMultiplier).toBe(1.0);
		event.activate();
		expect(manager.bountyMultiplier).toBe(2.0);
	});

	it('resets bounty multiplier to 1.0 on deactivate', () => {
		const event = new WarProfiteering();
		const manager = RandomEventManager.getInstance();

		event.activate();
		expect(manager.bountyMultiplier).toBe(2.0);
		event.deactivate();
		expect(manager.bountyMultiplier).toBe(1.0);
	});

	it('does not affect income multiplier', () => {
		const event = new WarProfiteering();
		const manager = RandomEventManager.getInstance();

		event.activate();
		expect(manager.incomeMultiplier).toBe(1.0);
		event.deactivate();
		expect(manager.incomeMultiplier).toBe(1.0);
	});

	it('returns a non-empty announce string', () => {
		const event = new WarProfiteering();
		expect(event.announce().length).toBeGreaterThan(0);
	});
});
