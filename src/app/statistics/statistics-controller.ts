import { ENABLE_EXPORT_END_GAME_SCORE } from 'src/configs/game-settings';
import { NameManager } from '../managers/names/name-manager';
import { ExportEndGameScore, EndGameScoreData } from '../utils/export-statistics/export-end-game-score';
import { ComputeRatio } from '../utils/utils';
import { StatisticsModel } from './statistics-model';
import { RankedStatisticsView } from './ranked-statistics-view';
import { UnrankedStatisticsView } from './unranked-statistics-view';
import { IStatisticsView } from './base-statistics-view';
import { GlobalGameData } from '../game/state/global-game-state';
import { ParticipantEntityManager } from '../utils/participant-entity';
import { RatingManager } from '../rating/rating-manager';
import { PlayerManager } from '../player/player-manager';
import { UNIT_ID } from 'src/configs/unit-id';

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

		const data: EndGameScoreData[] = ranks.map((player) => {
			const btag = NameManager.getInstance().getBtag(player.getPlayer());
			const rivalPlayer = this.model.getRival(player);
			const rivalBtag = rivalPlayer ? NameManager.getInstance().getBtag(rivalPlayer.getPlayer()) : 'null';

			// Get rating data
			const ratingResults = ratingManager.getRatingResults();
			const ratingResult = ratingResults ? ratingResults.get(btag) : undefined;
			const rating = ratingResult?.newRating ?? ratingManager.getPlayerRating(btag);
			const ratingChange = ratingResult?.totalChange ?? 0;

			// Get player KD stats
			const playerKD = player.trackedData.killsDeaths.get(player.getPlayer());

			// Get SS stats
			const ssKD = player.trackedData.killsDeaths.get(`${UNIT_ID.BATTLESHIP_SS}`);
			const ssKills = ssKD?.kills ?? 0;
			const ssDeaths = ssKD?.deaths ?? 0;

			// Get Tank stats
			const tankKD = player.trackedData.killsDeaths.get(`${UNIT_ID.TANK}`);
			const tankKills = tankKD?.kills ?? 0;
			const tankDeaths = tankKD?.deaths ?? 0;

			return {
				Player: btag,
				Rank: (ranks.indexOf(player) + 1).toString(),
				Rating: rating.toString(),
				RatingChange: ratingChange.toString(),
				BiggestRival: rivalBtag,
				LastTurn: player.trackedData.turnDied.toString(),
				CitiesMax: player.trackedData.cities.max.toString(),
				CitiesEnd: player.trackedData.cities.end.toString(),
				IncomeMax: player.trackedData.income.max.toString(),
				IncomeEnd: player.trackedData.income.end.toString(),
				GoldEarned: player.trackedData.gold.earned.toString(),
				GoldMax: player.trackedData.gold.max.toString(),
				GoldEnd: player.trackedData.gold.end.toString(),
				Kills: playerKD.killValue.toString(),
				Deaths: playerKD.deathValue.toString(),
				KD: ComputeRatio(playerKD.killValue, playerKD.deathValue).toString(),
				BountyEarned: player.trackedData.bounty.earned.toString(),
				BonusEarned: player.trackedData.bonus.earned.toString(),
				SSKills: ssKills.toString(),
				SSDeaths: ssDeaths.toString(),
				SSKD: ComputeRatio(ssKills, ssDeaths).toString(),
				TankKills: tankKills.toString(),
				TankDeaths: tankDeaths.toString(),
				TankKD: ComputeRatio(tankKills, tankDeaths).toString(),
				Denies: player.trackedData.denies.toString(),
				RoarCasts: player.trackedData.roarCasts.toString(),
				DispelCasts: player.trackedData.dispelCasts.toString(),
			};
		});

		if (ENABLE_EXPORT_END_GAME_SCORE) {
			ExportEndGameScore.write(data);
		}
	}
}
