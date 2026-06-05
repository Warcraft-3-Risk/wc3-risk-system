import { CountdownMessage, ErrorMsg } from 'src/app/utils/messages';
import { PlayGlobalSound } from 'src/app/utils/utils';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { EDITOR_DEVELOPER_MODE, STARTING_COUNTDOWN } from '../../../../configs/game-settings';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { PlayerManager } from 'src/app/player/player-manager';
import { RatingManager } from 'src/app/rating/rating-manager';
import { HexColors } from 'src/app/utils/hex-colors';
import { NameManager } from 'src/app/managers/names/name-manager';
import { SettingsContext } from 'src/app/settings/settings-context';
import { updateRatingStatsButtonForRankedStatus } from 'src/app/ui/player-preference-buttons';
import { GlobalGameData } from '../../state/global-game-state';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';

const SKIP_COMMAND = '-skip';

export function isSkipCountdownAllowed(humanPlayerCount: number, isDeveloperMode: boolean = EDITOR_DEVELOPER_MODE): boolean {
	return isDeveloperMode || humanPlayerCount === 1;
}

export class CountdownState<T extends StateData> extends BaseState<T> {
	private initialDuration: number;
	private countdownDuration: number;
	private shouldSkipToNextState: boolean = false;

	public constructor(duration: number = STARTING_COUNTDOWN) {
		super();
		this.initialDuration = duration;
		this.countdownDuration = duration;
	}

	onEnterState() {
		try {
			PlayGlobalSound('Sound\\Interface\\ArrangedTeamInvitation.flac');

			// Check if this is a ranked game (ratings will be loaded per-player when needed)
			// Use initial player count to prevent early leavers from downgrading ranked status
			const ratingManager = RatingManager.getInstance();
			const humanPlayerCount = PlayerManager.getInstance().getInitialHumanPlayerCount();
			const isFFA = SettingsContext.getInstance().isFFA();
			const isRanked = ratingManager.checkRankedGameEligibility(humanPlayerCount, isFFA);

			// Only show rating-related messages and UI if the rating system is enabled
			if (ratingManager.isRatingSystemEnabled()) {
				if (isRanked) {
					// Generate unique game ID for crash recovery
					ratingManager.generateGameId();

					// Retroactively finalize any human players who left before ranked status was determined
					GlobalGameData.matchPlayers.forEach((matchPlayer) => {
						if (
							GetPlayerController(matchPlayer.getPlayer()) === MAP_CONTROL_USER &&
							GetPlayerSlotState(matchPlayer.getPlayer()) !== PLAYER_SLOT_STATE_PLAYING
						) {
							ratingManager.finalizePlayerRating(matchPlayer);
						}
					});

					// Only show ranked/unranked message on the first match (not on restarts)
					if (GlobalGameData.matchCount === 1) {
						const message = `${HexColors.TANGERINE}This is a ranked game!|r Press ${HexColors.TANGERINE}F4|r or ${HexColors.TANGERINE}use the button in the top-left corner|r to view your stats.`;

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

					// Note: P2P rating sync already started in ModeSelection.run() during settings phase
				} else {
					// Only show ranked/unranked message on the first match (not on restarts)
					if (GlobalGameData.matchCount === 1 && isFFA) {
						const message = `${HexColors.TANGERINE}This is an unranked game!|r Ranked play requires at least ${HexColors.TANGERINE}16 eligible FFA players|r.`;

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
				}

				// Pre-initialize rating stats UI frames for all players during countdown
				PlayerManager.getInstance().playersAndObservers.forEach((player) => {
					if (player.ratingStatsUI) {
						player.ratingStatsUI.preInitialize();
					}
					// Update F4 button appearance based on ranked status
					updateRatingStatsButtonForRankedStatus(player, isRanked);
				});
			}

			const startDelayTimer: timer = CreateTimer();
			this.countdownDuration = this.initialDuration;
			BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), true);
			this.countdownDisplay(this.countdownDuration);
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

				// Allow replay viewers to switch POV during countdown
				ScoreboardManager.getInstance().updateReplayPov();

				BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), true);
				this.countdownDisplay(this.countdownDuration);

				if (this.countdownDuration >= 1 && this.countdownDuration <= 3) {
					PlayGlobalSound('Sound\\Interface\\BattleNetTick.flac');
				}

				if (this.countdownDuration <= 0) {
					PauseTimer(startDelayTimer);
					DestroyTimer(startDelayTimer);
					BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), false);
					PlayGlobalSound('Sound\\Interface\\Hint.flac');

					this.nextState(this.stateData);
				}
				this.countdownDuration--;
			});
		} catch (error) {
			print('Error in Metagame ' + error);
		}
	}

	onPlayerChat(player: player, message: string): void {
		const cmd = message.split(' ')[0].toLowerCase().trim();

		if (cmd !== SKIP_COMMAND) return;

		const humanPlayerCount = PlayerManager.getInstance().getCurrentActiveHumanPlayers().length;

		if (!isSkipCountdownAllowed(humanPlayerCount)) {
			ErrorMsg(player, '-skip is only available in developer mode or single-player games.');
			return;
		}

		this.countdownDuration = 0;
		this.countdownDisplay(this.countdownDuration);
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
		const durationText = duration <= 3 ? `${HexColors.TANGERINE}${duration}|r` : `${duration}`;
		CountdownMessage(`The Game will start in\n${durationText}`);
	}
}
