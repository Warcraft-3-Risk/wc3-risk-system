import { CountdownMessage } from 'src/app/utils/messages';
import { PlayGlobalSound } from 'src/app/utils/utils';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { STARTING_COUNTDOWN } from '../../../../configs/game-settings';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { PlayerManager } from 'src/app/player/player-manager';
import { RatingManager } from 'src/app/rating/rating-manager';
import { HexColors } from 'src/app/utils/hex-colors';
import { NameManager } from 'src/app/managers/names/name-manager';
import { SettingsContext } from 'src/app/settings/settings-context';
import { updateRatingStatsButtonForRankedStatus } from 'src/app/ui/player-preference-buttons';

export class CountdownState<T extends StateData> extends BaseState<T> {
	private initialDuration: number;
	private shouldSkipToNextState: boolean = false;

	public constructor(duration: number = STARTING_COUNTDOWN) {
		super();
		this.initialDuration = duration;
	}

	onEnterState() {
		try {
			PlayGlobalSound('Sound\\Interface\\ArrangedTeamInvitation.flac');

			// Check if this is a ranked game (ratings will be loaded per-player when needed)
			const ratingManager = RatingManager.getInstance();
			const humanPlayerCount = PlayerManager.getInstance().getHumanPlayersCount();
			const isFFA = SettingsContext.getInstance().isFFA();
			const isRanked = ratingManager.checkRankedGameEligibility(humanPlayerCount, isFFA);

			// Only show rating-related messages and UI if the rating system is enabled
			if (ratingManager.isRatingSystemEnabled()) {
				if (isRanked) {
					// Generate unique game ID for crash recovery
					ratingManager.generateGameId();
					const message = ratingManager.isDeveloperModeEnabled()
						? `${HexColors.TANGERINE}This is a ranked game!|r Press ${HexColors.TANGERINE}F4|r or ${HexColors.TANGERINE}use the button in the top-left corner|r to view your stats. Using developer mode settings.`
						: `${HexColors.TANGERINE}This is a ranked game!|r Press ${HexColors.TANGERINE}F4|r or ${HexColors.TANGERINE}use the button in the top-left corner|r to view your stats.`;

					// Send message only to players who have rating display enabled
					PlayerManager.getInstance().playersAndObservers.forEach((activePlayer) => {
						const btag = NameManager.getInstance().getBtag(activePlayer.getPlayer());
						const showRating = ratingManager.getShowRatingPreference(btag);

						// Only show message if player has rating display enabled
						if (showRating) {
							DisplayTimedTextToPlayer(activePlayer.getPlayer(), 0, 0, 5, message);
						}
					});

					// Note: P2P rating sync already started in ModeSelection.run() during settings phase
				} else {
					const message = `${HexColors.TANGERINE}This is an unranked game!|r Ranked play requires at least ${HexColors.TANGERINE}16 eligible players|r.`;

					// Send message only to players who have rating display enabled
					PlayerManager.getInstance().playersAndObservers.forEach((activePlayer) => {
						const btag = NameManager.getInstance().getBtag(activePlayer.getPlayer());
						const showRating = ratingManager.getShowRatingPreference(btag);

						// Only show message if player has rating display enabled
						if (showRating) {
							DisplayTimedTextToPlayer(activePlayer.getPlayer(), 0, 0, 5, message);
						}
					});
				}

				// Pre-initialize rating stats UI frames for all players during countdown
				PlayerManager.getInstance().players.forEach((player) => {
					if (player.ratingStatsUI && player.ratingStatsUI.preInitialize) {
						player.ratingStatsUI.preInitialize();
					}
					// Update F4 button appearance based on ranked status
					updateRatingStatsButtonForRankedStatus(player, isRanked);
				});
			}

			const startDelayTimer: timer = CreateTimer();
			let duration: number = this.initialDuration;
			BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), true);
			this.countdownDisplay(duration);
			TimerStart(startDelayTimer, 1, true, () => {
				// Check if we should skip to next state due to forfeit
				if (this.shouldSkipToNextState) {
					PauseTimer(startDelayTimer);
					DestroyTimer(startDelayTimer);
					BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), false);
					PlayGlobalSound('Sound\\Interface\\Hint.flac');
					this.nextState(this.stateData);
					return;
				}

				BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), true);
				this.countdownDisplay(duration);
				if (duration <= 0) {
					PauseTimer(startDelayTimer);
					DestroyTimer(startDelayTimer);
					BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), false);
					PlayGlobalSound('Sound\\Interface\\Hint.flac');

					this.nextState(this.stateData);
				}
				duration--;
			});
		} catch (error) {
			print('Error in Metagame ' + error);
		}
	}

	onPlayerForfeit(player: ActivePlayer): void {
		super.onPlayerForfeit(player);

		// Check how many human players remain after this forfeit
		const humanPlayers = PlayerManager.getInstance().getCurrentActiveHumanPlayers();

		// If only 1 or 2 human players remain, skip countdown and go to next state
		if (humanPlayers.length <= 2) {
			this.shouldSkipToNextState = true;
		}
	}

	countdownDisplay(duration: number): void {
		CountdownMessage(`The Game will start in\n${duration}`);
	}
}
