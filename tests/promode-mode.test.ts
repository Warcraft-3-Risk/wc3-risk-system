/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../tests/fixtures/wc3-shim';

vi.mock('../src/app/utils/utils', () => ({
	NEUTRAL_HOSTILE: {},
	MAP_TYPE: 'risk',
	MAP_VERSION: '1.0.0',
	PLAYER_COLOR_CODES: [],
}));

let mockGetTeamFromPlayer: any = (_player: any) => null;
vi.mock('../src/app/teams/team-manager', () => ({
	TeamManager: {
		getInstance: () => ({
			getTeamFromPlayer: mockGetTeamFromPlayer,
		}),
	},
}));

vi.mock('../src/app/utils/debug-print', () => ({ debugPrint: () => {} }));

vi.mock('../src/app/game/game-mode/base-game-mode/city-distribute-state', () => ({
	CityDistributeState: class {
		onPlayerForfeit() {}
		onPlayerLeft() {}
	},
}));
vi.mock('../src/app/game/game-mode/base-game-mode/game-over-state', () => ({
	GameOverState: class {
		onPlayerForfeit() {}
		onPlayerLeft() {}
	},
}));
vi.mock('../src/app/game/game-mode/base-game-mode/reset-state', () => ({
	ResetState: class {
		onPlayerForfeit() {}
		onPlayerLeft() {}
	},
}));
vi.mock('../src/app/game/game-mode/base-game-mode/setup-state', () => ({
	SetupState: class {
		onPlayerForfeit() {}
		onPlayerLeft() {}
	},
}));
vi.mock('../src/app/game/game-mode/base-game-mode/apply-fog-state', () => ({
	ApplyFogState: class {
		onPlayerForfeit() {}
		onPlayerLeft() {}
	},
}));
vi.mock('../src/app/game/game-mode/base-game-mode/update-player-status-state', () => ({
	UpdatePlayerStatusState: class {
		onPlayerForfeit() {}
		onPlayerLeft() {}
	},
}));
vi.mock('../src/app/game/game-mode/base-game-mode/enable-controls-state', () => ({
	EnableControlsState: class {
		onPlayerForfeit() {}
		onPlayerLeft() {}
	},
}));
vi.mock('../src/app/game/game-mode/promode-game-mode/set-promode-temp-vision-state', () => ({
	SetPromodeTempVisionState: class {
		onPlayerForfeit() {}
		onPlayerLeft() {}
	},
}));
vi.mock('../src/app/game/game-mode/promode-game-mode/promode-countdown-state', () => ({
	PromodeCountdownState: class {
		onPlayerForfeit() {}
		onPlayerLeft() {}
	},
}));
vi.mock('../src/app/game/game-mode/promode-game-mode/promode-game-loop-state', () => ({
	ProModeGameLoopState: class {
		onPlayerForfeit() {}
		onPlayerLeft() {}
	},
}));

// WC3 globabl stubs go first
(globalThis as any).Player = (id: number) => ({ id });
(globalThis as any).PLAYER_NEUTRAL_AGGRESSIVE = 12;

import { PromodeMode } from '../src/app/game/game-mode/mode/promode-mode';
import { BaseState } from '../src/app/game/game-mode/state/base-state';
import { ActivePlayer } from '../src/app/player/types/active-player';

describe('PromodeMode wrapState team forfeit rules', () => {
	let promodeMode: PromodeMode;
	let dummyState: BaseState<any>;
	// Track calls to originalOnPlayerForfeit
	let forfeitCalls: ActivePlayer[] = [];

	beforeEach(() => {
		forfeitCalls = [];
		promodeMode = new (class extends PromodeMode {
			public testWrapState(state: BaseState<any>) {
				return this.wrapState(state);
			}
		})();

		dummyState = {
			onPlayerForfeit: vi.fn((player: ActivePlayer) => {
				forfeitCalls.push(player);
			}),
			onPlayerLeft: vi.fn(),
		} as unknown as BaseState<any>;

		// Apply the wrapper
		promodeMode['wrapState'](dummyState);
	});

	const createFakeActivePlayer = (id: number, isEliminated: boolean, isActive: boolean): ActivePlayer => {
		return {
			getPlayer: () => ({ id }),
			status: {
				isEliminated: () => isEliminated,
				isActive: () => isActive,
			},
		} as unknown as ActivePlayer;
	};

	it('should trigger cascade forfeit when 50% or more of team is eliminated upon forfeit', () => {
		const p1 = createFakeActivePlayer(1, true, false); // just eliminated
		const p2 = createFakeActivePlayer(2, false, true); // active
		const p3 = createFakeActivePlayer(3, false, true); // active
		const p4 = createFakeActivePlayer(4, true, false); // already eliminated

		const mockTeam = {
			getMembers: () => [p1, p2, p3, p4],
		};

		mockGetTeamFromPlayer = vi.fn().mockReturnValue(mockTeam);

		// p1 forfeits
		dummyState.onPlayerForfeit(p1);

		// 2 out of 4 are eliminated = 50%. It should trigger cascade forfeit for p2 and p3.
		expect(forfeitCalls).toContain(p1);
		expect(forfeitCalls).toContain(p2);
		expect(forfeitCalls).toContain(p3);
		expect(forfeitCalls).not.toContain(p4); // p4 is not active
	});

	it('should not cascade forfeit when less than 50% of team is eliminated', () => {
		const p1 = createFakeActivePlayer(1, true, false); // just eliminated
		const p2 = createFakeActivePlayer(2, false, true); // active
		const p3 = createFakeActivePlayer(3, false, true); // active
		const p4 = createFakeActivePlayer(4, false, true); // active

		const mockTeam = {
			getMembers: () => [p1, p2, p3, p4],
		};

		mockGetTeamFromPlayer = vi.fn().mockReturnValue(mockTeam);

		// p1 forfeits
		dummyState.onPlayerForfeit(p1);

		// 1 out of 4 is eliminated = 25%. Should not trigger cascade.
		expect(forfeitCalls).toEqual([p1]);
	});

	it('should trigger cascade forfeit on player leaving if 50% threshold met', () => {
		const p1 = createFakeActivePlayer(1, true, false); // just eliminated
		const p2 = createFakeActivePlayer(2, false, true); // active

		const mockTeam = {
			getMembers: () => [p1, p2],
		};

		mockGetTeamFromPlayer = vi.fn().mockReturnValue(mockTeam);

		// p1 leaves
		dummyState.onPlayerLeft(p1);

		// 1 out of 2 is eliminated = 50%. Cascade happens via originalOnPlayerForfeit.
		expect(forfeitCalls).toContain(p2);
	});
});
