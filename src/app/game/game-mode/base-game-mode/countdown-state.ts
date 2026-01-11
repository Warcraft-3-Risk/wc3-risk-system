import { CountdownMessage } from 'src/app/utils/messages';
import { PlayGlobalSound } from 'src/app/utils/utils';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { STARTING_COUNTDOWN } from '../../../../configs/game-settings';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { PlayerManager } from 'src/app/player/player-manager';
import { RatingManager } from 'src/app/rating/rating-manager';
import { RatingSyncManager } from 'src/app/rating/rating-sync-manager';
import { GlobalMessage } from 'src/app/utils/messages';
import { HexColors } from 'src/app/utils/hex-colors';

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
			if (ratingManager.checkRankedGameEligibility(humanPlayerCount)) {
				// Generate unique game ID for crash recovery
				ratingManager.generateGameId();
				const message = ratingManager.isDeveloperModeEnabled()
					? `${HexColors.TANGERINE}This is a ranked game!|r Use ${HexColors.TANGERINE}-help|r if you're new to the game. Press ${HexColors.TANGERINE}F4|r or ${HexColors.TANGERINE}use the button in the top-left corner|r to view your stats. Using developer mode settings.`
					: `${HexColors.TANGERINE}This is a ranked game!|r Use ${HexColors.TANGERINE}-help|r if you're new to the game. Press ${HexColors.TANGERINE}F4|r or ${HexColors.TANGERINE}use the button in the top-left corner|r to view your stats.`;

				// Send message to all players as chat text (like -help command)
				PlayerManager.getInstance().playersAndObservers.forEach((activePlayer) => {
					DisplayTimedTextToPlayer(activePlayer.getPlayer(), 0, 0, 8, message);
				});

				// Start P2P rating synchronization
				const syncManager = RatingSyncManager.getInstance();

				// Enable developer mode if rating manager has it enabled
				if (ratingManager.isDeveloperModeEnabled()) {
					syncManager.enableDeveloperMode();
				}

				// Get human players only (excludes AI/Computer)
				const humanPlayers = PlayerManager.getInstance().getHumanPlayersOnly();
				syncManager.startSync(humanPlayers);
			} else {

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
