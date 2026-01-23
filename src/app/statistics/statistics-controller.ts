import { ENABLE_EXPORT_END_GAME_SCORE } from 'src/configs/game-settings';
import { NameManager } from '../managers/names/name-manager';
import { ExportEndGameScore } from '../utils/export-statistics/export-end-game-score';
import { ComputeRatio } from '../utils/utils';
import { StatisticsModel } from './statistics-model';
import { RankedStatisticsView } from './ranked-statistics-view';
import { UnrankedStatisticsView } from './unranked-statistics-view';
import { IStatisticsView } from './base-statistics-view';
import { GlobalGameData } from '../game/state/global-game-state';
import { ParticipantEntityManager } from '../utils/participant-entity';
import { RatingManager } from '../rating/rating-manager';
import { PlayerManager } from '../player/player-manager';

export class StatisticsController {
	private static instance: StatisticsController;
	private model: StatisticsModel;
	private rankedView: RankedStatisticsView;
	private unrankedView: UnrankedStatisticsView;

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
		this.rankedView = new RankedStatisticsView(this.model);
		this.unrankedView = new UnrankedStatisticsView(this.model);

		// Register minimize button events for both views
		this.setupMinimizeButtonEvents();
	}

	/**
	 * Setup minimize button click events for both ranked and unranked views
	 */
	private setupMinimizeButtonEvents(): void {
		// Ranked view minimize button
		this.rankedView.setMinimizeButtonClickEvent(() => {
			const player: player = GetTriggerPlayer();

			if (this.rankedView.getMinimizeButtonText() === 'Minimize') {
				this.rankedView.hideStats(player);
			} else if (this.rankedView.getMinimizeButtonText() === 'Maximize') {
				this.rankedView.showStats(player);
			}

			return false;
		});

		// Unranked view minimize button
		this.unrankedView.setMinimizeButtonClickEvent(() => {
			const player: player = GetTriggerPlayer();

			if (this.unrankedView.getMinimizeButtonText() === 'Minimize') {
				this.unrankedView.hideStats(player);
			} else if (this.unrankedView.getMinimizeButtonText() === 'Maximize') {
				this.unrankedView.showStats(player);
			}

			return false;
		});
	}

	/**
	 * Determine if a player should see the ranked statistics view
	 * @param playerHandle The player to check
	 * @returns True if player should see ranked view, false for unranked view
	 */
	private shouldShowRankedView(playerHandle: player): boolean {
		const playerManager = PlayerManager.getInstance();
		const ratingManager = RatingManager.getInstance();

		// If game is not ranked, everyone sees unranked view
		if (!ratingManager.isRatingSystemEnabled() || !ratingManager.isRankedGame()) {
			return false;
		}

		if(playerManager.isObserver(playerHandle)) {
			return ratingManager.isRankedGame();
		}

		// If game is ranked, check player's preference
		const btag = NameManager.getInstance().getBtag(playerHandle);
		const showRating = ratingManager.getShowRatingPreference(btag);

		return showRating;
	}

	/**
	 * Get the appropriate view for a specific player
	 * @param playerHandle The player
	 * @returns The view instance (ranked or unranked)
	 */
	private getViewForPlayer(playerHandle: player): IStatisticsView {
		return this.shouldShowRankedView(playerHandle) ? this.rankedView : this.unrankedView;
	}

	/**
	 * Set visibility of the statistics board
	 * Shows the appropriate view (ranked/unranked) per player based on game mode and preferences
	 * @param isVisible Whether to show or hide the statistics board
	 */
	public setViewVisibility(isVisible: boolean) {
		// Iterate through all players and show the appropriate view to each
		const playerManager = PlayerManager.getInstance();

		playerManager.playersAndObservers.forEach((activePlayer, playerHandle) => {
			if (isVisible) {
				// Determine which view this player should see
				const shouldSeeRanked = this.shouldShowRankedView(playerHandle);

				// Show the appropriate view, hide the other
				this.rankedView.setVisibilityForPlayer(shouldSeeRanked, playerHandle);
				this.unrankedView.setVisibilityForPlayer(!shouldSeeRanked, playerHandle);
			} else {
				// Hide both views for this player
				this.rankedView.setVisibilityForPlayer(false, playerHandle);
				this.unrankedView.setVisibilityForPlayer(false, playerHandle);
			}
		});
	}

	public setPlayedTimeText() {
		const time = this.model.getTimePlayed();
		this.rankedView.setPlayedTimeText(time);
		this.unrankedView.setPlayedTimeText(time);
	}

	public setGameWinnerText() {
		if (!this.model.getWinner()) {
			return;
		}

		const winner: player = this.model.getWinner().getPlayer();
		const name: string = ParticipantEntityManager.getWinnerParticipantName(winner);

		this.rankedView.setGameWinnerText(name);
		this.unrankedView.setGameWinnerText(name);
	}

	public refreshView() {
		this.model.setData();
		this.setPlayedTimeText();
		this.setGameWinnerText();
		this.rankedView.refreshRows();
		this.unrankedView.refreshRows();
	}

	public getModel() {
		return this.model;
	}

	public writeStatisticsData() {
		const ranks = this.model.getRanks();

		// Calculate and save ratings if this is a ranked game
		const ratingManager = RatingManager.getInstance();
		if (ratingManager.isRankedGame()) {
			ratingManager.calculateAndSaveRatings(ranks);

			// Refresh rating stats UI for all players to show updated ratings
			ranks.forEach((player) => {
				player.ratingStatsUI.refresh();
			});

			// Refresh both statistics views to show rating changes immediately
			this.rankedView.refreshRows();
			this.unrankedView.refreshRows();
		}

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
