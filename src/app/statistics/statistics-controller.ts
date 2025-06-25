import { ENABLE_EXPORT_END_GAME_SCORE } from 'src/configs/game-settings';
import { NameManager } from '../managers/names/name-manager';
import { ExportEndGameScore } from '../utils/export-statistics/export-end-game-score';
import { ComputeRatio } from '../utils/utils';
import { StatisticsModel } from './statistics-model';
import { StatisticsView } from './statistics-view';
import { GlobalGameData } from '../game/state/global-game-state';
import { ParticipantEntityManager } from '../utils/participant-entity';

export class StatisticsController {
	private static instance: StatisticsController;
	private model: StatisticsModel;
	private view: StatisticsView;

	private constructor() {
		this.useCurrentActivePlayers();
	}

	public static getInstance(): StatisticsController {
		if (this.instance == null) {
			this.instance = new StatisticsController();
		}

		return this.instance;
	}

	// Should be called on match startup, ensures that future statistics are based on the current match players pool at the start of the match.
	public useCurrentActivePlayers() {
		this.model = new StatisticsModel(GlobalGameData.matchPlayers);
		this.view = new StatisticsView(this.model);

		this.view.setMinimizeButtonClickEvent(() => {
			const player: player = GetTriggerPlayer();

			if (this.view.getMinimizeButtonText() === 'Hide Stats') {
				this.view.hideStats(player);
			} else if (this.view.getMinimizeButtonText() === 'Show Stats') {
				this.view.showStats(player);
			}

			return false;
		});
	}

	public setViewVisibility(isVisible: boolean) {
		this.view.setVisibility(isVisible);
	}

	public setPlayedTimeText() {
		this.view.setPlayedTimeText(this.model.getTimePlayed());
	}

	public setGameWinnerText() {
		if (!this.model.getWinner()) {
			return;
		}

		const winner: player = this.model.getWinner().getPlayer();
		const name: string = ParticipantEntityManager.getWinnerParticipantName(winner);

		this.view.setGameWinnerText(name);
	}

	public refreshView() {
		this.model.setData();
		this.setPlayedTimeText();
		this.setGameWinnerText();
		this.view.refreshRows();
	}

	public getModel() {
		return this.model;
	}

	public writeStatisticsData() {
		const ranks = this.model.getRanks();

		const data = ranks.map((player) => {
			const rivalPlayer = this.model.getRival(player);
			const rivalBtag = rivalPlayer ? NameManager.getInstance().getBtag(rivalPlayer.getPlayer()) : 'null';

			return {
				Player: NameManager.getInstance().getBtag(player.getPlayer()),
				Rank: (ranks.indexOf(player) + 1).toString(),
				LastTurn: player.trackedData.turnDied.toString(),
				CitiesEnd: player.trackedData.cities.end.toString(),
				CitiesMax: player.trackedData.cities.max.toString(),
				BountyEarned: player.trackedData.bounty.earned.toString(),
				BonusEarned: player.trackedData.bonus.earned.toString(),
				GoldEarned: player.trackedData.gold.earned.toString(),
				GoldMax: player.trackedData.gold.max.toString(),
				GoldEnd: player.trackedData.gold.end.toString(),
				Kills: player.trackedData.killsDeaths.get(player.getPlayer()).killValue.toString(),
				Deaths: player.trackedData.killsDeaths.get(player.getPlayer()).deathValue.toString(),
				KD: ComputeRatio(
					player.trackedData.killsDeaths.get(player.getPlayer()).killValue,
					player.trackedData.killsDeaths.get(player.getPlayer()).deathValue
				).toString(),
				BiggestRival: rivalBtag,
			};
		});

		if (ENABLE_EXPORT_END_GAME_SCORE) {
			ExportEndGameScore.write(data);
		}
	}
}
