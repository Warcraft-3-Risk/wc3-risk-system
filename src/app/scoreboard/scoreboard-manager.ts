import { GlobalGameData } from '../game/state/global-game-state';
import { OvertimeManager } from '../managers/overtime-manager';
import { VictoryManager } from '../managers/victory-manager';
import { ActivePlayer } from '../player/types/active-player';
import { HexColors } from '../utils/hex-colors';
import { ParticipantEntityManager } from '../utils/participant-entity';
import { SettingsContext } from '../settings/settings-context';
import { isReplay, getReplayObservedPlayer } from '../utils/game-status';
import { ScoreboardDataModel } from './scoreboard-data-model';
import { ScoreboardRenderer } from './scoreboard-renderer';
import { PlayerRenderer } from './player-renderer';
import { TeamRenderer } from './team-renderer';
import { ObserverRenderer } from './observer-renderer';
import { SessionRenderer } from './session-renderer';

export type ScoreboardViewType = 'standard' | 'obs';

export class ScoreboardManager {
	private static instance: ScoreboardManager;
	private dataModel: ScoreboardDataModel;
	private renderers: Record<ScoreboardViewType, ScoreboardRenderer | undefined>;
	private sessionRenderer: SessionRenderer | undefined = undefined;
	private activePlayers: ActivePlayer[] = [];
	private observers: player[] = [];
	private lastObservedPlayer: player | undefined = undefined;

	private constructor() {
		this.dataModel = new ScoreboardDataModel();
		this.renderers = {
			standard: undefined,
			obs: undefined,
		};
	}

	public static getInstance(): ScoreboardManager {
		return this.instance || (this.instance = new this());
	}

	/**
	 * Reset the singleton instance. For testing purposes only.
	 */
	public static resetInstance(): void {
		this.instance = undefined as unknown as ScoreboardManager;
	}

	public ffaSetup(players: ActivePlayer[]) {
		this.activePlayers = players;
		this.dataModel.refresh(this.activePlayers, true);

		const renderer = new PlayerRenderer(players.length);
		renderer.renderFull(this.dataModel);
		this.renderers.standard = renderer;
	}

	public teamSetup(players: ActivePlayer[]) {
		this.activePlayers = players;
		this.dataModel.refresh(this.activePlayers, false);

		const renderer = new TeamRenderer(this.dataModel.teams);
		renderer.renderFull(this.dataModel);
		this.renderers.standard = renderer;
	}

	public obsSetup(players: ActivePlayer[], observers: player[]) {
		this.activePlayers = players;
		this.observers = observers;

		if (observers.length >= 1) {
			this.dataModel.refresh(this.activePlayers, this.isFFA());

			const obsRenderer = new ObserverRenderer(players.length);
			obsRenderer.renderFull(this.dataModel);
			this.renderers.obs = obsRenderer;

			obsRenderer.setVisibility(false);
			if (this.renderers.standard) this.renderers.standard.setVisibility(true);

			observers.forEach((handle) => {
				if (GetLocalPlayer() === handle) {
					if (this.renderers.standard) this.renderers.standard.setVisibility(false);
					obsRenderer.setVisibility(true);
				}
			});
		}
	}

	public toggleVisibility(bool: boolean) {
		if (!bool) {
			this.iterateRenderers((r) => r.setVisibility(false));
			return;
		}

		// When showing, respect observer/player board assignment
		if (this.renderers.obs) {
			if (this.renderers.standard) this.renderers.standard.setVisibility(true);

			this.observers.forEach((handle) => {
				if (GetLocalPlayer() === handle) {
					if (this.renderers.standard) this.renderers.standard.setVisibility(false);
					this.renderers.obs!.setVisibility(true);
				}
			});
		} else {
			this.iterateRenderers((r) => r.setVisibility(true));
		}
	}

	public updateFull() {
		this.checkReplayPovBoardSwap();
		this.dataModel.refresh(this.activePlayers, this.isFFA());
		this.iterateRenderers((r) => r.renderFull(this.dataModel));
	}

	public updatePartial() {
		this.checkReplayPovBoardSwap();
		this.dataModel.refreshValues(this.activePlayers, this.isFFA());
		this.iterateRenderers((r) => r.renderPartial(this.dataModel));
	}

	/**
	 * Lightweight POV check for use outside the game loop (e.g. countdown).
	 * Only swaps board visibility — does not refresh data or re-render.
	 */
	public updateReplayPov() {
		this.checkReplayPovBoardSwap();
	}

	public setTitle(str: string) {
		this.iterateRenderers((r) => r.setTitle(str));
	}

	public setAlert(player: player, alert: string) {
		this.iterateRenderers((r) => r.renderAlert(player, alert));
	}

	public destroyBoards() {
		this.iterateRenderers((r) => {
			r.setVisibility(false);
			r.destroy();
		});
		this.renderers = { standard: undefined, obs: undefined };
	}

	public sessionSetup(players: ActivePlayer[]): void {
		if (!this.sessionRenderer) {
			this.sessionRenderer = new SessionRenderer(players);
		}
	}

	public showSessionBoard(): void {
		if (this.sessionRenderer) {
			this.sessionRenderer.setVisibility(true);
		}
	}

	public hideSessionBoard(): void {
		if (this.sessionRenderer) {
			this.sessionRenderer.setVisibility(false);
		}
	}

	public getSessionBoard(): SessionRenderer | undefined {
		return this.sessionRenderer;
	}

	private iterateRenderers(callback: (renderer: ScoreboardRenderer) => void) {
		Object.values(this.renderers).forEach((renderer) => {
			if (renderer) {
				callback(renderer);
			}
		});
	}

	private isFFA(): boolean {
		return SettingsContext.getInstance().isFFA() || this.activePlayers.length <= 2;
	}

	private checkReplayPovBoardSwap(): void {
		if (!isReplay() || !this.renderers.obs) return;

		const observed = getReplayObservedPlayer();
		if (observed === this.lastObservedPlayer) return;

		this.lastObservedPlayer = observed;

		// Refresh effectiveLocal so renderers use the new POV
		this.dataModel.refreshEffectiveLocal();

		const isObserver = this.observers.some((obs) => obs === observed);
		if (isObserver) {
			if (this.renderers.standard) this.renderers.standard.setVisibility(false);
			this.renderers.obs.setVisibility(true);
		} else {
			this.renderers.obs.setVisibility(false);
			if (this.renderers.standard) this.renderers.standard.setVisibility(true);
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
