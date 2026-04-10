import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must be declared before Country is imported so Vitest hoists them correctly.
vi.mock('src/app/utils/messages', () => ({
	LocalMessage: vi.fn(),
}));

vi.mock('src/app/utils/utils', () => ({
	NEUTRAL_HOSTILE: { _isNeutralHostile: true },
}));

// Prevent heavy WC3-dependent transitive imports from executing.
vi.mock('src/app/spawner/spawner', () => ({
	Spawner: class {
		setOwner(_p: unknown) {}
	},
	SPAWNER_UNITS: new Map(),
}));

vi.mock('src/app/city/city', () => ({
	City: class {},
}));

import { Country } from 'src/app/country/country';
import { LocalMessage } from 'src/app/utils/messages';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';

const mockLocalMessage = vi.mocked(LocalMessage);

function makePlayer(id: number): player {
	return { id } as unknown as player;
}

function makeCountry(name = 'France'): Country {
	const fakeSpawn = { setOwner: vi.fn() };
	const fakeCities = [{ barrack: { defaultX: 0, defaultY: 0 } }];
	return new Country(name, fakeCities as any, fakeSpawn as any);
}

describe('Country.setOwner', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(globalThis as any).AddSpecialEffect = vi.fn().mockReturnValue({});
		(globalThis as any).BlzSetSpecialEffectScale = vi.fn();
		(globalThis as any).DestroyEffect = vi.fn();
	});

	describe('conquered sound (new owner)', () => {
		it('plays Rescue.flac for the new owner', () => {
			const country = makeCountry('France');
			const newOwner = makePlayer(1);

			country.setOwner(newOwner);

			expect(mockLocalMessage).toHaveBeenCalledWith(newOwner, expect.stringContaining('France'), 'Sound\\Interface\\Rescue.flac');
		});

		it('does not play any sound when new owner is NEUTRAL_HOSTILE', () => {
			const country = makeCountry('France');

			country.setOwner(NEUTRAL_HOSTILE as unknown as player);

			expect(mockLocalMessage).not.toHaveBeenCalled();
		});

		it('does not play any sound when setOwner is called with null', () => {
			const country = makeCountry('France');

			country.setOwner(null);

			expect(mockLocalMessage).not.toHaveBeenCalled();
		});
	});

	describe('lost sound (previous owner)', () => {
		it('plays QuestFailed.flac for the previous owner when a country is taken', () => {
			const country = makeCountry('France');
			const player1 = makePlayer(1);
			const player2 = makePlayer(2);

			country.setOwner(player1);
			vi.clearAllMocks();
			country.setOwner(player2);

			expect(mockLocalMessage).toHaveBeenCalledWith(player1, expect.stringContaining('France'), 'Sound\\Interface\\QuestFailed.flac');
		});

		it('does not play QuestFailed.flac on the first capture (no previous owner)', () => {
			const country = makeCountry('France');

			country.setOwner(makePlayer(1));

			const lostCalls = mockLocalMessage.mock.calls.filter(([, , sound]) => sound === 'Sound\\Interface\\QuestFailed.flac');
			expect(lostCalls).toHaveLength(0);
		});

		it('does not play QuestFailed.flac when previous owner was NEUTRAL_HOSTILE', () => {
			const country = makeCountry('France');

			// Simulate country being initially neutral (e.g. after reset)
			country.setOwner(NEUTRAL_HOSTILE as unknown as player);
			vi.clearAllMocks();
			country.setOwner(makePlayer(1));

			const lostCalls = mockLocalMessage.mock.calls.filter(([, , sound]) => sound === 'Sound\\Interface\\QuestFailed.flac');
			expect(lostCalls).toHaveLength(0);
		});

		it('does not play QuestFailed.flac when the new owner is NEUTRAL_HOSTILE', () => {
			const country = makeCountry('France');
			const player1 = makePlayer(1);

			country.setOwner(player1);
			vi.clearAllMocks();
			country.setOwner(NEUTRAL_HOSTILE as unknown as player);

			expect(mockLocalMessage).not.toHaveBeenCalled();
		});
	});

	describe('message content', () => {
		it('includes the country name in the conquered message', () => {
			const country = makeCountry('Germany');
			country.setOwner(makePlayer(1));

			expect(mockLocalMessage).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('Germany'), 'Sound\\Interface\\Rescue.flac');
		});

		it('includes the country name in the lost message', () => {
			const country = makeCountry('Germany');
			const player1 = makePlayer(1);
			country.setOwner(player1);
			vi.clearAllMocks();
			country.setOwner(makePlayer(2));

			expect(mockLocalMessage).toHaveBeenCalledWith(player1, expect.stringContaining('Germany'), 'Sound\\Interface\\QuestFailed.flac');
		});
	});
});
