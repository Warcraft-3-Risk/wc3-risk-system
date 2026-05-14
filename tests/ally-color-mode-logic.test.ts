import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../src/app/utils/game-status', () => ({
	isReplay: vi.fn(() => false),
}));

import { AllyColorState, PlayerSettings } from '../src/app/managers/alliances/ally-color-state';

// @ts-expect-error Mocking global function
globalThis.GetLocalPlayer = vi.fn(() => null);
// @ts-expect-error Mocking global function
globalThis.IsPlayerObserver = vi.fn(() => false);
// @ts-expect-error Mocking global function
globalThis.GetPlayerId = vi.fn((player: unknown) => (typeof player === 'number' ? player : ((player as { id?: number })?.id ?? 0)));
// @ts-expect-error Mocking global value
globalThis.bj_MAX_PLAYERS = 24;

describe('AllyColorState', () => {
	let settings: PlayerSettings;
	let allyColorState: AllyColorState;

	beforeEach(() => {
		settings = {
			savedMode: 0,
			saveMode: vi.fn(),
			loadMode: vi.fn().mockImplementation(() => settings.savedMode),
		};
		allyColorState = new AllyColorState(settings);
	});

	it('initializes in Mode 0 by default if no saved config exists', () => {
		expect(allyColorState.getMode()).toBe(0);
	});

	it('initializes to a persisted value (Mode 1 or 2)', () => {
		settings.savedMode = 2;
		const state = new AllyColorState(settings);
		expect(state.getMode()).toBe(2);
	});

	it('toggles from Mode 0 to Mode 1 and saves', () => {
		allyColorState.toggle();
		expect(allyColorState.getMode()).toBe(1);
		expect(settings.saveMode).toHaveBeenCalledWith(1);
	});

	it('toggles from Mode 1 to Mode 2 and saves', () => {
		settings.savedMode = 1;
		const state = new AllyColorState(settings);
		state.toggle();
		expect(state.getMode()).toBe(2);
		expect(settings.saveMode).toHaveBeenCalledWith(2);
	});

	it('toggles from Mode 2 to Mode 0 and saves', () => {
		settings.savedMode = 2;
		const state = new AllyColorState(settings);
		state.toggle();
		expect(state.getMode()).toBe(0);
		expect(settings.saveMode).toHaveBeenCalledWith(0);
	});

	describe('Colors', () => {
		const defaultColor = 'DEFAULT';
		const blue = 'BLUE';
		const teal = 'TEAL';
		const yellow = 'YELLOW';
		const red = 'RED';

		beforeEach(() => {
			// Mock Alliance checks
			allyColorState.isAlly = vi.fn((player, localPlayer) => player === 2 || player === localPlayer);
			allyColorState.getDefaultColor = vi.fn((_player) => defaultColor);
			allyColorState.getBlue = vi.fn(() => blue);
			allyColorState.getTeal = vi.fn(() => teal);
			allyColorState.getYellow = vi.fn(() => yellow);
			allyColorState.getRed = vi.fn(() => red);
		});

		const P_LOCAL = 1;
		const P_ALLY = 2;
		const P_ENEMY = 3;
		const P_NEUTRAL = 24;

		it('returns colors correctly in Mode 0', () => {
			expect(allyColorState.getMinimapColor(P_LOCAL, P_LOCAL)).toBe(defaultColor);
			expect(allyColorState.getMinimapColor(P_ALLY, P_LOCAL)).toBe(defaultColor);
			expect(allyColorState.getMinimapColor(P_ENEMY, P_LOCAL)).toBe(defaultColor);

			expect(allyColorState.getUnitModelColor(P_LOCAL, P_LOCAL)).toBe(defaultColor);
			expect(allyColorState.getUnitModelColor(P_ALLY, P_LOCAL)).toBe(defaultColor);
			expect(allyColorState.getUnitModelColor(P_ENEMY, P_LOCAL)).toBe(defaultColor);
		});

		it('returns colors correctly in Mode 1', () => {
			allyColorState.toggle(); // Mode 1
			expect(allyColorState.getMinimapColor(P_LOCAL, P_LOCAL)).toBe(blue);
			expect(allyColorState.getMinimapColor(P_ALLY, P_LOCAL)).toBe(teal);
			expect(allyColorState.getMinimapColor(P_ENEMY, P_LOCAL)).toBe(red);

			expect(allyColorState.getUnitModelColor(P_LOCAL, P_LOCAL)).toBe(defaultColor);
			expect(allyColorState.getUnitModelColor(P_ALLY, P_LOCAL)).toBe(defaultColor);
			expect(allyColorState.getUnitModelColor(P_ENEMY, P_LOCAL)).toBe(defaultColor);
		});

		it('returns colors correctly in Mode 2', () => {
			allyColorState.toggle();
			allyColorState.toggle(); // Mode 2
			expect(allyColorState.getMinimapColor(P_LOCAL, P_LOCAL)).toBe(blue);
			expect(allyColorState.getMinimapColor(P_ALLY, P_LOCAL)).toBe(teal);
			expect(allyColorState.getMinimapColor(P_ENEMY, P_LOCAL)).toBe(red);

			expect(allyColorState.getUnitModelColor(P_LOCAL, P_LOCAL)).toBe(blue);
			expect(allyColorState.getUnitModelColor(P_ALLY, P_LOCAL)).toBe(teal);
			expect(allyColorState.getUnitModelColor(P_ENEMY, P_LOCAL)).toBe(red);
		});

		it('applies colorblind color (yellow) to allies when isColorBlind is true', () => {
			allyColorState.toggle(); // Mode 1
			expect(allyColorState.getMinimapColor(P_ALLY, P_LOCAL, true)).toBe(yellow);
			// unit model color is not overridden in Mode 1
			expect(allyColorState.getUnitModelColor(P_ALLY, P_LOCAL, true)).toBe(defaultColor);

			allyColorState.toggle(); // Mode 2
			expect(allyColorState.getMinimapColor(P_ALLY, P_LOCAL, true)).toBe(yellow);
			expect(allyColorState.getUnitModelColor(P_ALLY, P_LOCAL, true)).toBe(yellow);
		});

		it('keeps neutral player colors in ally color modes', () => {
			const stateWithNeutralCheck = allyColorState as AllyColorState & { isNeutral: (player: number) => boolean };
			stateWithNeutralCheck.isNeutral = vi.fn((player) => player === P_NEUTRAL);

			allyColorState.toggle(); // Mode 1
			expect(allyColorState.getMinimapColor(P_NEUTRAL, P_LOCAL)).toBe(defaultColor);
			expect(allyColorState.getUnitModelColor(P_NEUTRAL, P_LOCAL)).toBe(defaultColor);

			allyColorState.toggle(); // Mode 2
			expect(allyColorState.getMinimapColor(P_NEUTRAL, P_LOCAL)).toBe(defaultColor);
			expect(allyColorState.getUnitModelColor(P_NEUTRAL, P_LOCAL)).toBe(defaultColor);
		});
	});
});
