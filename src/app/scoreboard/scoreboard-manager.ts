import { GlobalGameData } from '../game/state/global-game-state';
import { OvertimeManager } from '../managers/overtime-manager';
import { VictoryManager } from '../managers/victory-manager';
import { ActivePlayer } from '../player/types/active-player';
import { HexColors } from '../utils/hex-colors';
import { ParticipantEntityManager } from '../utils/participant-entity';
import { ObserverBoard } from './observer-board';
import { Scoreboard } from './scoreboard';
import { SessionBoard } from './session-board';
import { StandardBoard } from './standard-board';
import { TeamBoard } from './team-board';
import { isReplay, getReplayObservedPlayer } from '../utils/game-status';

export type ScoreboardTypes = 'standard' | 'obs';

export class ScoreboardManager {
	private static instance: ScoreboardManager;
	private scoreboards: Record<ScoreboardTypes, Scoreboard>;
	private sessionBoard: SessionBoard | null = null;
	private observers: player[] = [];
	private lastObservedPlayer: player | null = null;

	private constructor() {
		this.scoreboards = {
			standard: undefined,
			obs: undefined,
		};
	}

	public static getInstance(): ScoreboardManager {
		return this.instance || (this.instance = new this());
	}

	public ffaSetup(players: ActivePlayer[]) {
		this.scoreboards.standard = new StandardBoard(players);
	}

	public teamSetup() {
		this.scoreboards.standard = new TeamBoard();
	}

	public obsSetup(players: ActivePlayer[], observers: player[]) {
		this.observers = observers;

		if (observers.length >= 1) {
			this.scoreboards.obs = new ObserverBoard(players);
			this.scoreboards.obs.setVisibility(false);
			this.scoreboards.standard.setVisibility(true);

			observers.forEach((handle) => {
				if (GetLocalPlayer() == handle) {
					if (this.scoreboards.standard) this.scoreboards.standard.setVisibility(false);
					if (this.scoreboards.obs) this.scoreboards.obs.setVisibility(true);
				}
			});
		}
	}

	public toggleVisibility(bool: boolean) {
		this.iterateBoards((board) => board.setVisibility(bool));
	}

	public updateFull() {
		this.checkReplayPovBoardSwap();
		this.iterateBoards((board) => board.updateFull());
	}

	public updatePartial() {
		this.checkReplayPovBoardSwap();
		this.iterateBoards((board) => board.updatePartial());
	}

	public setTitle(str: string) {
		this.iterateBoards((board) => board.setTitle(str));
	}

	public setAlert(player: player, alert: string) {
		this.iterateBoards((board) => board.setAlert(player, alert));
	}

	public destroyBoards() {
		if (isReplay()) {
			this.iterateBoards((board) => board.setVisibility(false));
		} else {
			this.iterateBoards((board) => board.destroy());
		}
		this.scoreboards = { standard: undefined, obs: undefined };
	}

	public sessionSetup(players: ActivePlayer[]): void {
		if (!this.sessionBoard) {
			this.sessionBoard = new SessionBoard(players);
		}
	}

	public showSessionBoard(): void {
		if (this.sessionBoard) {
			this.sessionBoard.setVisibility(true);
		}
	}

	public hideSessionBoard(): void {
		if (this.sessionBoard) {
			this.sessionBoard.setVisibility(false);
		}
	}

	public getSessionBoard(): SessionBoard | null {
		return this.sessionBoard;
	}

	private iterateBoards(callback: (board: Scoreboard) => void) {
		Object.values(this.scoreboards).forEach((board) => {
			if (board) {
				callback(board);
			}
		});
	}

	private checkReplayPovBoardSwap(): void {
		if (!isReplay() || !this.scoreboards.obs) return;

		const observed = getReplayObservedPlayer();
		if (observed === this.lastObservedPlayer) return;

		this.lastObservedPlayer = observed;
		const isObserver = this.observers.some((obs) => obs === observed);
		if (isObserver) {
			if (this.scoreboards.standard) this.scoreboards.standard.setVisibility(false);
			this.scoreboards.obs.setVisibility(true);
		} else {
			this.scoreboards.obs.setVisibility(false);
			if (this.scoreboards.standard) this.scoreboards.standard.setVisibility(true);
		}
	}

	public updateScoreboardTitle() {
		// If current leader is eliminated, find the new leader (non-eliminated player with most cities)
		if (GlobalGameData.leader instanceof ActivePlayer && GlobalGameData.leader.status.isEliminated()) {
			const allParticipants = VictoryManager.getInstance().getOwnershipByThresholdDescending(0);
			const validLeader = allParticipants.find((participant) => {
				if (participant instanceof ActivePlayer) {
					return !participant.status.isEliminated();
				}
				return true; // Teams are already filtered by getActiveTeams()
			});
			GlobalGameData.leader = validLeader;
		}

		if (GlobalGameData.leader) {
			const requiredCities = VictoryManager.getCityCountWin();
			const leaderDisplayName = ParticipantEntityManager.getDisplayName(GlobalGameData.leader);
			const leaderCityCount = ParticipantEntityManager.getCityCount(GlobalGameData.leader);
			const isLeaderCityCountHighlighted = leaderCityCount >= requiredCities;

			const overtimeSuffix = OvertimeManager.isOvertimeActive()
				? ` ${HexColors.RED}(Overtime)|r`
				: `${OvertimeManager.isOvertimeEnabled() ? ` (Overtime in: ${OvertimeManager.getTurnsUntilOvertimeIsActivated()})` : ''}`;

			if (isLeaderCityCountHighlighted) {
				this.setTitle(`${leaderDisplayName} ${HexColors.RED}${leaderCityCount}|r/${HexColors.RED}${requiredCities}|r${overtimeSuffix}`);
			} else {
				this.setTitle(`${leaderDisplayName} ${leaderCityCount}/${HexColors.RED}${requiredCities}|r${overtimeSuffix}`);
			}
		} else {
			const overtimeSuffix = OvertimeManager.isOvertimeActive()
				? ` ${HexColors.RED}(Overtime)|r`
				: `${OvertimeManager.isOvertimeEnabled() ? ` (Overtime in: ${OvertimeManager.getTurnsUntilOvertimeIsActivated()})` : ''}`;
			this.setTitle(`Risk Europe${overtimeSuffix}`);
		}
	}
}
