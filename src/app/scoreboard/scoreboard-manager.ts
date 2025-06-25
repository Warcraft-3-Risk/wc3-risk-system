import { GlobalGameData } from '../game/state/global-game-state';
import { OvertimeManager } from '../managers/overtime-manager';
import { VictoryManager } from '../managers/victory-manager';
import { ActivePlayer } from '../player/types/active-player';
import { debugPrint } from '../utils/debug-print';
import { HexColors } from '../utils/hex-colors';
import { ParticipantEntityManager } from '../utils/participant-entity';
import { ObserverBoard } from './observer-board';
import { Scoreboard } from './scoreboard';
import { StandardBoard } from './standard-board';
import { TeamBoard } from './team-board';

export type ScoreboardTypes = 'standard' | 'obs';

export class ScoreboardManager {
	private static instance: ScoreboardManager;
	private scoreboards: Record<ScoreboardTypes, Scoreboard>;

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

	public updateFull() {
		this.iterateBoards((board) => board.updateFull());
	}

	public updatePartial() {
		this.iterateBoards((board) => board.updatePartial());
	}

	public setTitle(str: string) {
		this.iterateBoards((board) => board.setTitle(str));
	}

	public setAlert(player: player, alert: string) {
		this.iterateBoards((board) => board.setAlert(player, alert));
	}

	public destroyBoards() {
		this.iterateBoards((board) => board.destroy());
		this.scoreboards = { standard: undefined, obs: undefined };
	}

	private iterateBoards(callback: (board: Scoreboard) => void) {
		Object.values(this.scoreboards).forEach((board) => {
			if (board) {
				callback(board);
			}
		});
	}

	public updateScoreboardTitle() {
		if (GlobalGameData.leader) {
			if (GlobalGameData.leader instanceof ActivePlayer) {
				debugPrint('Leader is an ActivePlayer');
			} else {
				debugPrint('Leader is an Team');
			}

			const overtimeSuffix = OvertimeManager.isOvertimeActive()
				? ` ${HexColors.RED}(Overtime)|r`
				: `${OvertimeManager.isOvertimeEnabled() ? ` (Overtime in: ${OvertimeManager.getTurnsUntilOvertimeIsActivated()})` : ''}`;

			this.setTitle(
				`${ParticipantEntityManager.getDisplayName(GlobalGameData.leader)} ${ParticipantEntityManager.getCityCount(
					GlobalGameData.leader
				)}/${HexColors.RED}${VictoryManager.getCityCountWin()}|r${overtimeSuffix}`
			);
		} else {
			const overtimeSuffix = OvertimeManager.isOvertimeActive()
				? ` ${HexColors.RED}(Overtime)|r`
				: `${OvertimeManager.isOvertimeEnabled() ? ` (Overtime in: ${OvertimeManager.getTurnsUntilOvertimeIsActivated()})` : ''}`;
			this.setTitle(`Risk Europe${overtimeSuffix}`);
		}
	}
}
