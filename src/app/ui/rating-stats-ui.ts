import { ActivePlayer } from '../player/types/active-player';
import { HexColors } from '../utils/hex-colors';
import { RatingManager } from '../rating/rating-manager';
import { getRankIcon } from '../rating/rating-calculator';
import { NameManager } from '../managers/names/name-manager';
import { RANKED_SEASON_ID } from 'src/configs/game-settings';
import { EventEmitter } from '../utils/events/event-emitter';
import { EVENT_QUEST_UPDATE_PLAYER_STATUS } from '../utils/events/event-constants';
import { CreateObserverButton } from '../utils/observer-helper';
import { PlayerManager } from '../player/player-manager';
import { truncateWithColorCode } from '../utils/utils';

export class RatingStatsUI {
	private player: ActivePlayer;
	private frameBackdrop: framehandle | null = null;
	private isVisible: boolean = false;
	private titleText: framehandle | null = null;
	private rankIconBadge: framehandle | null = null;
	private ratingText: framehandle | null = null;
	private seasonText: framehandle | null = null;
	private averageRankText: framehandle | null = null;
	private gamesText: framehandle | null = null;
	private winBarFill: framehandle | null = null;
	private winPercentText: framehandle | null = null;
	private killBarFill: framehandle | null = null;
	private killPercentText: framehandle | null = null;
	private toggleButton: framehandle | null = null;
	private closeButton: framehandle | null = null;
	private enableDisableButton: framehandle | null = null;
	private enableDisableButtonText: framehandle | null = null;
	private leaderboardFrame: framehandle | null = null;
	private leaderboardCloseButton: framehandle | null = null;
	private leaderboardRankIconFrames: framehandle[] = [];
	private leaderboardRankFrames: framehandle[] = [];
	private leaderboardELOFrames: framehandle[] = [];
	private leaderboardNameFrames: framehandle[] = [];
	private leaderboardWinRateFrames: framehandle[] = [];
	private leaderboardWinsFrames: framehandle[] = [];
	private leaderboardLossesFrames: framehandle[] = [];
	private leaderboardGamesFrames: framehandle[] = [];
	private leaderboardPrevButton: framehandle | null = null;
	private leaderboardNextButton: framehandle | null = null;
	private leaderboardMyPlaceButton: framehandle | null = null;
	private leaderboardPageText: framehandle | null = null;
	private isLeaderboardVisible: boolean = false;
	private isInitialized: boolean = false;
	private isLeaderboardInitialized: boolean = false;
	private currentPage: number = 0;
	private totalPages: number = 1;
	private readonly PLAYERS_PER_PAGE: number = 10;
	private escTrigger: trigger | null = null;

	constructor(player: ActivePlayer) {
		this.player = player;
		// Initialize frames when first needed
	}

	/**
	 * Pre-initialize frames during game setup (synchronized event)
	 * This prevents desync issues from frame creation during button clicks
	 * Should be called during countdown or setup phase
	 */
	public preInitialize(): void {
		if (GetLocalPlayer() == this.player.getPlayer()) {
			// Initialize main rating stats frames
			if (!this.isInitialized) {
				this.initializeFrames();
			}
			// Also initialize leaderboard frames
			// This prevents desync when leaderboard button is clicked
			if (!this.isLeaderboardInitialized) {
				this.initializeLeaderboardFrame();
			}
		}
	}

	private initializeFrames(): void {
		if (this.isInitialized) {
			return;
		}

		try {
			// Create the main frame from FDF definition
			this.frameBackdrop = BlzCreateFrame('RatingStatsFrame', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);

			// Get child frame references
			this.titleText = BlzGetFrameByName('RatingStatsTitle', 0);
			this.rankIconBadge = BlzGetFrameByName('RankIconBadge', 0);
			this.ratingText = BlzGetFrameByName('RatingValueText', 0);
			this.seasonText = BlzGetFrameByName('SeasonText', 0);
			this.averageRankText = BlzGetFrameByName('AverageRankText', 0);
			this.gamesText = BlzGetFrameByName('GamesPlayedText', 0);
			this.winBarFill = BlzGetFrameByName('WinBarFill', 0);
			this.winPercentText = BlzGetFrameByName('WinPercentText', 0);
			this.killBarFill = BlzGetFrameByName('KillBarFill', 0);
			this.killPercentText = BlzGetFrameByName('KillPercentText', 0);
			this.toggleButton = BlzGetFrameByName('RatingToggleButton', 0);
			this.closeButton = BlzGetFrameByName('RatingCloseButton', 0);
			this.enableDisableButton = BlzGetFrameByName('RatingDisableButton', 0);
			this.enableDisableButtonText = BlzGetFrameByName('RatingDisableButtonText', 0);

			// Set static label colors to match other labels (TANGERINE)
			const winLossLabel = BlzGetFrameByName('WinLossLabel', 0);
			if (winLossLabel) {
				BlzFrameSetText(winLossLabel, `${HexColors.TANGERINE}Win/Loss:|r`);
			}
			const killDeathLabel = BlzGetFrameByName('KillDeathLabel', 0);
			if (killDeathLabel) {
				BlzFrameSetText(killDeathLabel, `${HexColors.TANGERINE}Kill/Death Value:|r`);
			}

			if (!this.frameBackdrop || !this.toggleButton) {
				return;
			}

			// Register toggle button click event for leaderboard
			const toggleTrigger = CreateTrigger();
			BlzTriggerRegisterFrameEvent(toggleTrigger, this.toggleButton, FRAMEEVENT_CONTROL_CLICK);
			TriggerAddAction(toggleTrigger, () => {
				// Only execute for the player who owns this UI instance
				if (GetTriggerPlayer() == this.player.getPlayer()) {
					// Check if leaderboard has data before showing
					const ratingManager = RatingManager.getInstance();
					if (!ratingManager.hasLeaderboardData()) {
						// Show message that leaderboard is empty
						DisplayTimedTextToPlayer(
							this.player.getPlayer(),
							0,
							0,
							3,
							`${HexColors.RED}No leaderboard data available|r - no players have completed a game yet.`
						);
						return;
					}
					this.toggleLeaderboardDisplay();
				}
			});

			// Register close button click event
			if (this.closeButton) {
				const closeTrigger = CreateTrigger();
				BlzTriggerRegisterFrameEvent(closeTrigger, this.closeButton, FRAMEEVENT_CONTROL_CLICK);
				TriggerAddAction(closeTrigger, () => {
					// Only execute for the player who owns this UI instance
					if (GetTriggerPlayer() == this.player.getPlayer()) {
						this.hide();
					}
				});
			}

			// Register enable/disable button click event
			if (this.enableDisableButton) {
				const enableDisableTrigger = CreateTrigger();
				BlzTriggerRegisterFrameEvent(enableDisableTrigger, this.enableDisableButton, FRAMEEVENT_CONTROL_CLICK);
				TriggerAddAction(enableDisableTrigger, () => {
					// Only execute for the player who owns this UI instance
					if (GetTriggerPlayer() == this.player.getPlayer()) {
						this.toggleShowRatingPreference();

						// Reset frame to global context so hotkeys work
						BlzFrameSetEnable(this.enableDisableButton, false);
						BlzFrameSetEnable(this.enableDisableButton, true);
					}
				});
			}

			// Set initial button text based on preference
			this.updateEnableDisableButtonText();

			// Update quests
			EventEmitter.getInstance().emit(EVENT_QUEST_UPDATE_PLAYER_STATUS);

			// Register ESC key to close windows
			this.registerEscapeKey();

			// Initially hide the frame
			BlzFrameSetEnable(this.frameBackdrop, false);
			BlzFrameSetVisible(this.frameBackdrop, false);

			this.isInitialized = true;
			this.updateStatsFromManager();
		} catch (error) {
			// Silent fail
		}
	}

	public show(): void {
		if (GetLocalPlayer() == this.player.getPlayer()) {
			if (!this.isInitialized) {
				this.initializeFrames();
				if (!this.isInitialized) {
					return; // Initialization failed
				}
			}

			this.updateStatsFromManager();

			// Update the F4 button icon based on current preference
			const ratingManager = RatingManager.getInstance();
			const btag = NameManager.getInstance().getBtag(this.player.getPlayer());
			const showRating = ratingManager.getShowRatingPreference(btag);
			this.updateRatingButtonIcon(showRating);

			if (this.frameBackdrop) {
				BlzFrameSetEnable(this.frameBackdrop, true);
				BlzFrameSetVisible(this.frameBackdrop, true);
				BlzFrameSetFocus(this.frameBackdrop, false);
			}

			this.isVisible = true;
		}
	}

	public hide(): void {
		if (GetLocalPlayer() == this.player.getPlayer()) {
			if (this.frameBackdrop) {
				BlzFrameSetEnable(this.frameBackdrop, false);
				BlzFrameSetVisible(this.frameBackdrop, false);
			}
			this.isVisible = false;
		}
	}

	public toggle(): void {
		// If leaderboard is visible, close it and return to main window (don't toggle main window)
		if (this.isLeaderboardVisible) {
			this.hideLeaderboard();
			return;
		}

		if (this.isVisible) {
			this.hide();
		} else {
			this.show();
		}
	}

	/**
	 * Register ESC key to close rating stats window and leaderboard
	 * ESC priority: close leaderboard first, then close rating stats window
	 * Note: F4 is handled by guard-button-factory for toggle functionality (open/close)
	 */
	private registerEscapeKey(): void {
		// Register ESC key
		if (!this.escTrigger) {
			this.escTrigger = CreateTrigger();

			// Register ESC key for this player only (use key DOWN = true for more reliable capture)
			BlzTriggerRegisterPlayerKeyEvent(this.escTrigger, this.player.getPlayer(), OSKEY_ESCAPE, 0, false);

			TriggerAddCondition(
				this.escTrigger,
				Condition(() => {
					// Priority: close leaderboard first, then rating stats window
					if (this.isLeaderboardVisible) {
						this.hideLeaderboard();
					} else if (this.isVisible) {
						this.hide();
					}
				})
			);
		}
	}

	private toggleShowRatingPreference(): void {
		const ratingManager = RatingManager.getInstance();
		const btag = NameManager.getInstance().getBtag(this.player.getPlayer());

		// Get current preference
		const currentPreference = ratingManager.getShowRatingPreference(btag);

		// Toggle preference
		const newPreference = !currentPreference;
		const success = ratingManager.setShowRatingPreference(btag, newPreference);

		if (success) {
			// Update button text
			this.updateEnableDisableButtonText();

			// Update the F4 button icon to reflect the preference
			this.updateRatingButtonIcon(newPreference);

			// Show confirmation message
			const statusText = newPreference ? 'enabled' : 'disabled';
			const message = `${HexColors.TANGERINE}Displaying of stats has been ${statusText}.|r`;
			DisplayTimedTextToPlayer(this.player.getPlayer(), 0, 0, 3, message);
		} else {
			// Show error message
			DisplayTimedTextToPlayer(this.player.getPlayer(), 0, 0, 3, `${HexColors.RED}Failed to save rating preference|r`);
		}
	}

	/**
	 * Update the F4 rating button icon based on the showRating preference
	 * @param showRating True if rating is enabled, false if disabled
	 */
	private updateRatingButtonIcon(showRating: boolean): void {
		// Calculate the button context (same as in buildRatingStatsButton)
		const buttonContext = GetPlayerId(this.player.getPlayer()) + 300;
		const buttonBackdrop = BlzGetFrameByName('GuardButtonBackdrop', buttonContext);

		if (buttonBackdrop) {
			const texture = showRating
				? 'ReplaceableTextures\\CommandButtons\\BTNMedalHeroism.blp'
				: 'ReplaceableTextures\\CommandButtonsDisabled\\DISBTNMedalHeroism.blp';
			BlzFrameSetTexture(buttonBackdrop, texture, 0, false);
		}

		// Also update the tooltip text
		this.updateRatingButtonTooltip(showRating);
	}

	/**
	 * Update the F4 rating button tooltip to show current preference
	 * @param showRating True if rating is enabled, false if disabled
	 */
	private updateRatingButtonTooltip(showRating: boolean): void {
		const buttonContext = GetPlayerId(this.player.getPlayer()) + 300;
		const buttonTooltip = BlzGetFrameByName('GuardButtonToolTip', buttonContext);

		if (buttonTooltip) {
			const preferenceText = showRating ? `${HexColors.GREEN}Enabled` : `${HexColors.RED}Disabled`;
			BlzFrameSetText(
				buttonTooltip,
				`Rating Stats ${HexColors.TANGERINE}(F4)|r\nView your rating statistics and toggle rating display in post-game stats.\nCurrent preference: ${preferenceText}`
			);
		}
	}

	private updateEnableDisableButtonText(): void {
		if (!this.enableDisableButtonText) return;

		const ratingManager = RatingManager.getInstance();
		const btag = NameManager.getInstance().getBtag(this.player.getPlayer());
		const showRating = ratingManager.getShowRatingPreference(btag);

		const buttonText = showRating ? 'Ranked UI: Enabled' : 'Ranked UI: Disabled';
		BlzFrameSetText(this.enableDisableButtonText, buttonText);
	}

	public refresh(): void {
		if (GetLocalPlayer() == this.player.getPlayer()) {
			// Initialize frames if not already initialized
			if (!this.isInitialized) {
				this.initializeFrames();
			}
			// Update stats if visible OR if initialized (so data is fresh when opened)
			if (this.isInitialized) {
				this.updateStatsFromManager();
			}
		}
	}

	private updateRankIcon(rating: number): void {
		if (!this.rankIconBadge) return;

		// Get the appropriate rank icon path for UI display (higher resolution versions)
		const baseIconPath = getRankIcon(rating);
		// Replace "Assets\\Ranks\\" with "Assets\\Ranks\\UI\\" for higher-res UI versions
		const uiIconPath = baseIconPath.replace('Assets\\Ranks\\', 'Assets\\Ranks\\UserInterface\\');

		BlzFrameSetTexture(this.rankIconBadge, uiIconPath, 0, true);
	}

	private updateStatsFromManager(): void {
		if (!this.isInitialized) {
			return;
		}

		try {
			const ratingManager = RatingManager.getInstance();
			const btag = NameManager.getInstance().getBtag(this.player.getPlayer());
			const playerData = ratingManager.getPlayerData(btag);

			// Update leaderboard button state based on data availability
			this.updateLeaderboardButtonState();

			// Always show CONFIRMED stats (not pending entry values)
			// Pending entries are for crash recovery only, not for display
			this.updateStats(playerData);
		} catch (error) {
			// Silent fail
		}
	}

	private updateLeaderboardButtonState(): void {
		if (!this.toggleButton) return;

		const ratingManager = RatingManager.getInstance();
		const hasData = ratingManager.hasLeaderboardData();

		// Enable/disable button based on data availability
		BlzFrameSetEnable(this.toggleButton, hasData);

		// Visual feedback: make button look disabled when no data
		if (!hasData) {
			// Set tooltip or visual indication (optional)
			BlzFrameSetTooltip(this.toggleButton, BlzCreateFrame('BoxedText', this.toggleButton, 0, 0));
		}
	}

	private updateStats(playerData: any): void {
		if (!this.isInitialized) {
			return;
		}

		// Update title with player name (colored, without hashtag, max 10 chars)
		try {
			const nameManager = NameManager.getInstance();
			let playerAcct = nameManager.getAcct(this.player.getPlayer());
			// Truncate to 10 characters
			if (playerAcct.length > 10) {
				playerAcct = playerAcct.substring(0, 10);
			}
			const colorCode = nameManager.getColorCode(this.player.getPlayer());
			const coloredName = `${colorCode}${playerAcct}|r`;
			if (this.titleText) {
				BlzFrameSetText(this.titleText, coloredName);
			}
		} catch (error) {
			// Fallback to display name if acct/color fails
			if (this.titleText) {
				const fallbackName = truncateWithColorCode(
					NameManager.getInstance().getDisplayName(this.player.getPlayer()),
					10
				);
				BlzFrameSetText(this.titleText, fallbackName);
			}
		}

		if (!playerData) {
			// No data yet - show starting rating with current game's K/D stats
			this.updateRankIcon(1000);
			if (this.ratingText) BlzFrameSetText(this.ratingText, `${HexColors.TANGERINE}Rating:|r ${HexColors.WHITE}1000|r`);
			if (this.seasonText) BlzFrameSetText(this.seasonText, `${HexColors.TANGERINE}Season:|r ${HexColors.WHITE}${RANKED_SEASON_ID}|r`);
			if (this.averageRankText) BlzFrameSetText(this.averageRankText, `${HexColors.TANGERINE}Average Rank:|r ${HexColors.WHITE}-|r`);
			if (this.gamesText) BlzFrameSetText(this.gamesText, `${HexColors.TANGERINE}Games Played:|r ${HexColors.WHITE}0|r`);
			if (this.winPercentText) BlzFrameSetText(this.winPercentText, `0W / 0L (0%)`);
			if (this.winBarFill) BlzFrameSetSize(this.winBarFill, 0, 0.02);

			// Show current game's K/D even with no saved data
			let currentGameKills = 0;
			let currentGameDeaths = 0;

			try {
				if (this.player.trackedData && this.player.trackedData.killsDeaths) {
					const killsDeaths = this.player.trackedData.killsDeaths.get(this.player.getPlayer());
					currentGameKills = killsDeaths ? killsDeaths.killValue : 0;
					currentGameDeaths = killsDeaths ? killsDeaths.deathValue : 0;
				}
			} catch (error) {
				// Silent fail
			}

			const kdRatio = currentGameDeaths > 0 ? currentGameKills / currentGameDeaths : currentGameKills;
			const kdRatioText = string.format('%.2f', kdRatio);
			const kdBarWidth =
				currentGameDeaths > 0 ? math.min((currentGameKills / currentGameDeaths) * 0.105, 0.21) : currentGameKills > 0 ? 0.21 : 0;

			if (this.killPercentText) BlzFrameSetText(this.killPercentText, `${currentGameKills} K / ${currentGameDeaths} D (${kdRatioText})`);
			if (this.killBarFill) BlzFrameSetSize(this.killBarFill, kdBarWidth, 0.02);
			return;
		}

		// Rating
		this.updateRankIcon(playerData.rating);
		if (this.ratingText) BlzFrameSetText(this.ratingText, `${HexColors.TANGERINE}Rating:|r ${HexColors.WHITE}${playerData.rating}|r`);

		// Season
		if (this.seasonText) BlzFrameSetText(this.seasonText, `${HexColors.TANGERINE}Season:|r ${HexColors.WHITE}${RANKED_SEASON_ID}|r`);

		// Average Rank (calculated from total placement / games played)
		const totalPlacement = playerData.totalPlacement || 0;
		const avgRank = playerData.gamesPlayed > 0 ? totalPlacement / playerData.gamesPlayed : 0;
		const avgRankText = playerData.gamesPlayed > 0 ? `#${math.floor(avgRank + 0.5)}` : '-';
		if (this.averageRankText)
			BlzFrameSetText(this.averageRankText, `${HexColors.TANGERINE}Average Rank:|r ${HexColors.WHITE}${avgRankText}|r`);

		// Games played
		if (this.gamesText)
			BlzFrameSetText(this.gamesText, `${HexColors.TANGERINE}Games Played:|r ${HexColors.WHITE}${playerData.gamesPlayed}|r`);

		// Win/Loss
		const totalGames = playerData.wins + playerData.losses;
		const winPercent = totalGames > 0 ? math.floor((playerData.wins / totalGames) * 100) : 0;
		const winBarWidth = totalGames > 0 ? (playerData.wins / totalGames) * 0.21 : 0;

		if (this.winPercentText) BlzFrameSetText(this.winPercentText, `${playerData.wins}W / ${playerData.losses}L (${winPercent}%)`);
		if (this.winBarFill) BlzFrameSetSize(this.winBarFill, winBarWidth, 0.02);

		// Kill/Death - show saved totals only (current game is shown via pendingGame during game)
		// Note: During the game, updateStatsFromPendingGame is used which includes current game K/D
		// After game ends, playerData.totalKillValue already includes the current game's values
		const totalKills = playerData.totalKillValue || 0;
		const totalDeaths = playerData.totalDeathValue || 0;

		const kdRatio = totalDeaths > 0 ? totalKills / totalDeaths : totalKills;
		const kdRatioText = string.format('%.2f', kdRatio);
		const kdBarWidth = totalDeaths > 0 ? math.min((totalKills / totalDeaths) * 0.105, 0.21) : totalKills > 0 ? 0.21 : 0;

		if (this.killPercentText) BlzFrameSetText(this.killPercentText, `${totalKills} K / ${totalDeaths} D (${kdRatioText})`);
		if (this.killBarFill) BlzFrameSetSize(this.killBarFill, kdBarWidth, 0.02);
	}

	public toggleLeaderboardDisplay(): void {
		if (this.isLeaderboardVisible) {
			this.hideLeaderboard();
		} else {
			this.showLeaderboard();
		}
	}

	public showLeaderboard(): void {
		if (GetLocalPlayer() == this.player.getPlayer()) {
			if (!this.isInitialized) return;

			// Check if leaderboard has data
			const ratingManager = RatingManager.getInstance();
			if (!ratingManager.hasLeaderboardData()) {
				// Don't show leaderboard if no data available
				return;
			}

			// Initialize leaderboard frame if needed
			if (!this.isLeaderboardInitialized) {
				this.initializeLeaderboardFrame();
			}

			if (!this.isLeaderboardInitialized) return;

			// Hide rating stats window
			if (this.frameBackdrop) {
				BlzFrameSetVisible(this.frameBackdrop, false);
				BlzFrameSetEnable(this.frameBackdrop, false);
			}
			this.isVisible = false;

			// Show leaderboard window
			if (this.leaderboardFrame) {
				BlzFrameSetVisible(this.leaderboardFrame, true);
				BlzFrameSetEnable(this.leaderboardFrame, true);
			}

			// Reset to first page
			this.currentPage = 0;

			// Load and display leaderboard data
			this.updateLeaderboardData();

			this.isLeaderboardVisible = true;
		}
	}

	private hideLeaderboard(): void {
		if (GetLocalPlayer() == this.player.getPlayer()) {
			// Hide leaderboard window only (rating stats window is already hidden)
			if (this.leaderboardFrame) {
				BlzFrameSetVisible(this.leaderboardFrame, false);
				BlzFrameSetEnable(this.leaderboardFrame, false);
			}

			this.isLeaderboardVisible = false;
		}
	}

	private initializeLeaderboardFrame(): void {
		try {
			// Create the leaderboard frame from FDF definition
			this.leaderboardFrame = BlzCreateFrame('LeaderboardFrame', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);

			if (!this.leaderboardFrame) {
				return;
			}

			// Get close button reference
			this.leaderboardCloseButton = BlzGetFrameByName('LeaderboardCloseButton', 0);

			// Register close button click event
			if (this.leaderboardCloseButton) {
				const closeLeaderboardTrigger = CreateTrigger();
				BlzTriggerRegisterFrameEvent(closeLeaderboardTrigger, this.leaderboardCloseButton, FRAMEEVENT_CONTROL_CLICK);
				TriggerAddAction(closeLeaderboardTrigger, () => {
					// Only execute for the player who owns this UI instance
					if (GetTriggerPlayer() == this.player.getPlayer()) {
						this.hideLeaderboard();
					}
				});

				CreateObserverButton(this.leaderboardCloseButton, IsPlayerObserver(GetLocalPlayer()), () => {
					this.hideLeaderboard();
				});
			}

			// Get pagination button references
			this.leaderboardPrevButton = BlzGetFrameByName('LeaderboardPrevButton', 0);
			this.leaderboardNextButton = BlzGetFrameByName('LeaderboardNextButton', 0);
			this.leaderboardMyPlaceButton = BlzGetFrameByName('LeaderboardMyPlaceButton', 0);
			this.leaderboardPageText = BlzGetFrameByName('LeaderboardPageText', 0);

			// Register pagination button click events
			if (this.leaderboardPrevButton) {
				const prevTrigger = CreateTrigger();
				BlzTriggerRegisterFrameEvent(prevTrigger, this.leaderboardPrevButton, FRAMEEVENT_CONTROL_CLICK);
				TriggerAddAction(prevTrigger, () => {
					// Only execute for the player who owns this UI instance
					if (GetTriggerPlayer() == this.player.getPlayer()) {
						this.previousPage();

						BlzFrameSetEnable(this.leaderboardPrevButton, false);
						BlzFrameSetEnable(this.leaderboardPrevButton, true);
					}
				});

				CreateObserverButton(this.leaderboardPrevButton, IsPlayerObserver(GetLocalPlayer()), () => {
					this.previousPage();

					// Shift focus back to global context, so key events work properly (ESC, F4 etc.)
					BlzFrameSetEnable(this.leaderboardPrevButton, false);
					BlzFrameSetEnable(this.leaderboardPrevButton, true);
				});
			}

			if (this.leaderboardNextButton) {
				const nextTrigger = CreateTrigger();
				BlzTriggerRegisterFrameEvent(nextTrigger, this.leaderboardNextButton, FRAMEEVENT_CONTROL_CLICK);
				TriggerAddAction(nextTrigger, () => {
					// Only execute for the player who owns this UI instance
					if (GetTriggerPlayer() == this.player.getPlayer()) {
						this.nextPage();

						BlzFrameSetEnable(this.leaderboardNextButton, false);
						BlzFrameSetEnable(this.leaderboardNextButton, true);
					}
				});

				CreateObserverButton(this.leaderboardNextButton, IsPlayerObserver(GetLocalPlayer()), () => {
					this.nextPage();

					// Shift focus back to global context, so key events work properly (ESC, F4 etc.)
					BlzFrameSetEnable(this.leaderboardNextButton, false);
					BlzFrameSetEnable(this.leaderboardNextButton, true);
				});
			}

			if (this.leaderboardMyPlaceButton) {
				const myPlaceTrigger = CreateTrigger();
				BlzTriggerRegisterFrameEvent(myPlaceTrigger, this.leaderboardMyPlaceButton, FRAMEEVENT_CONTROL_CLICK);
				TriggerAddAction(myPlaceTrigger, () => {
					// Only execute for the player who owns this UI instance
					if (GetTriggerPlayer() == this.player.getPlayer()) {
						this.jumpToMyPlace();
					}
				});

				CreateObserverButton(this.leaderboardMyPlaceButton, IsPlayerObserver(GetLocalPlayer()), () => {
					this.jumpToMyPlace();
				});
			}

			// Create 10 rows of column frames for player entries dynamically
			let yOffset = -0.095;
			for (let i = 0; i < 10; i++) {
				// Rank column
				const rankFrame = BlzCreateFrameByType('TEXT', `LeaderboardPlayerRank${i}`, this.leaderboardFrame, '', 0);
				BlzFrameSetPoint(rankFrame, FRAMEPOINT_TOPLEFT, this.leaderboardFrame, FRAMEPOINT_TOPLEFT, 0.02, yOffset);
				BlzFrameSetSize(rankFrame, 0.023, 0.02);
				BlzFrameSetText(rankFrame, '');
				BlzFrameSetTextAlignment(rankFrame, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
				this.leaderboardRankFrames.push(rankFrame);

				// Rank icon (before ELO)
				const rankIconFrame = BlzCreateFrameByType('BACKDROP', `LeaderboardPlayerRankIcon${i}`, this.leaderboardFrame, '', 0);
				BlzFrameSetPoint(rankIconFrame, FRAMEPOINT_TOPLEFT, this.leaderboardFrame, FRAMEPOINT_TOPLEFT, 0.058, yOffset + 0.0025);
				BlzFrameSetSize(rankIconFrame, 0.015, 0.015);
				this.leaderboardRankIconFrames.push(rankIconFrame);

				// ELO column
				const eloFrame = BlzCreateFrameByType('TEXT', `LeaderboardPlayerELO${i}`, this.leaderboardFrame, '', 0);
				BlzFrameSetPoint(eloFrame, FRAMEPOINT_TOPLEFT, this.leaderboardFrame, FRAMEPOINT_TOPLEFT, 0.075, yOffset);
				BlzFrameSetSize(eloFrame, 0.05, 0.02);
				BlzFrameSetText(eloFrame, '');
				BlzFrameSetTextAlignment(eloFrame, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
				this.leaderboardELOFrames.push(eloFrame);

				// Name column
				const nameFrame = BlzCreateFrameByType('TEXT', `LeaderboardPlayerName${i}`, this.leaderboardFrame, '', 0);
				BlzFrameSetPoint(nameFrame, FRAMEPOINT_TOPLEFT, this.leaderboardFrame, FRAMEPOINT_TOPLEFT, 0.11, yOffset);
				BlzFrameSetSize(nameFrame, 0.15, 0.02);
				BlzFrameSetText(nameFrame, '');
				BlzFrameSetTextAlignment(nameFrame, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
				this.leaderboardNameFrames.push(nameFrame);

				// Win Rate column
				const winRateFrame = BlzCreateFrameByType('TEXT', `LeaderboardPlayerWinRate${i}`, this.leaderboardFrame, '', 0);
				BlzFrameSetPoint(winRateFrame, FRAMEPOINT_TOPLEFT, this.leaderboardFrame, FRAMEPOINT_TOPLEFT, 0.26, yOffset);
				BlzFrameSetSize(winRateFrame, 0.07, 0.02);
				BlzFrameSetText(winRateFrame, '');
				BlzFrameSetTextAlignment(winRateFrame, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
				this.leaderboardWinRateFrames.push(winRateFrame);

				// Wins column
				const winsFrame = BlzCreateFrameByType('TEXT', `LeaderboardPlayerWins${i}`, this.leaderboardFrame, '', 0);
				BlzFrameSetPoint(winsFrame, FRAMEPOINT_TOPLEFT, this.leaderboardFrame, FRAMEPOINT_TOPLEFT, 0.34, yOffset);
				BlzFrameSetSize(winsFrame, 0.05, 0.02);
				BlzFrameSetText(winsFrame, '');
				BlzFrameSetTextAlignment(winsFrame, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
				this.leaderboardWinsFrames.push(winsFrame);

				// Losses column
				const lossesFrame = BlzCreateFrameByType('TEXT', `LeaderboardPlayerLosses${i}`, this.leaderboardFrame, '', 0);
				BlzFrameSetPoint(lossesFrame, FRAMEPOINT_TOPLEFT, this.leaderboardFrame, FRAMEPOINT_TOPLEFT, 0.4, yOffset);
				BlzFrameSetSize(lossesFrame, 0.05, 0.02);
				BlzFrameSetText(lossesFrame, '');
				BlzFrameSetTextAlignment(lossesFrame, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
				this.leaderboardLossesFrames.push(lossesFrame);

				// Games column
				const gamesFrame = BlzCreateFrameByType('TEXT', `LeaderboardPlayerGames${i}`, this.leaderboardFrame, '', 0);
				BlzFrameSetPoint(gamesFrame, FRAMEPOINT_TOPLEFT, this.leaderboardFrame, FRAMEPOINT_TOPLEFT, 0.46, yOffset);
				BlzFrameSetSize(gamesFrame, 0.05, 0.02);
				BlzFrameSetText(gamesFrame, '');
				BlzFrameSetTextAlignment(gamesFrame, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
				this.leaderboardGamesFrames.push(gamesFrame);

				yOffset -= 0.022;
			}

			// Initially hide the leaderboard frame
			BlzFrameSetEnable(this.leaderboardFrame, false);
			BlzFrameSetVisible(this.leaderboardFrame, false);

			this.isLeaderboardInitialized = true;
		} catch (error) {
			// Silent fail
		}
	}

	private updateLeaderboardData(): void {
		const ratingManager = RatingManager.getInstance();

		// Get top 500 players only (strict filter by rating)
		// Low-rated players (even if in current game) will not appear
		const sortedPlayers = ratingManager.getTop500Players();

		if (sortedPlayers.length === 0) {
			this.displayNoLeaderboardData();
			return;
		}

		// Calculate total pages
		this.totalPages = math.max(1, math.ceil(sortedPlayers.length / this.PLAYERS_PER_PAGE));

		// Ensure current page is within bounds
		if (this.currentPage >= this.totalPages) {
			this.currentPage = this.totalPages - 1;
		}
		if (this.currentPage < 0) {
			this.currentPage = 0;
		}

		// Get players for current page
		const startIndex = this.currentPage * this.PLAYERS_PER_PAGE;
		const endIndex = math.min(startIndex + this.PLAYERS_PER_PAGE, sortedPlayers.length);
		const currentPagePlayers = sortedPlayers.slice(startIndex, endIndex);

		// Get local player's btag for highlighting
		const localBtag = NameManager.getInstance().getBtag(this.player.getPlayer());

		// Update each row's column frames
		for (let i = 0; i < 10; i++) {
			if (i < currentPagePlayers.length) {
				const player = currentPagePlayers[i];
				const rank = startIndex + i + 1;

				// Get rank color: prioritize local player, then rank-based colors, then gray
				let rankColor = HexColors.LIGHT_GRAY; // Default gray for non-ranked players

				// Check if this is the local player first (highest priority)
				if (player.btag === localBtag) {
					rankColor = HexColors.TANGERINE; // Local player always gets tangerine
				} else {
					// Otherwise, apply rank-based colors
					if (rank === 1) {
						rankColor = HexColors.YELLOW; // Gold
					} else if (rank === 2) {
						rankColor = HexColors.LAVENDER; // Silver
					} else if (rank === 3) {
						rankColor = HexColors.EMERALD; // Bronze
					}
					// All other ranks remain LIGHT_GRAY (set as default above)
				}

				// Format name (truncate if too long)
				let displayName = player.btag;
				if (displayName.length > 18) {
					displayName = displayName.substring(0, 15) + '...';
				}

				// Calculate stats
				const rating = math.floor(player.rating);
				const totalGames = player.wins + player.losses;
				const winRate = totalGames > 0 ? math.floor((player.wins / totalGames) * 100) : 0;

				// Set rank icon
				const rankIconPath = getRankIcon(rating);
				BlzFrameSetTexture(this.leaderboardRankIconFrames[i], rankIconPath, 0, true);
				BlzFrameSetVisible(this.leaderboardRankIconFrames[i], true);

				// Set each column
				BlzFrameSetText(this.leaderboardRankFrames[i], `${rankColor}${rank}|r`);
				BlzFrameSetText(this.leaderboardELOFrames[i], `${rankColor}${rating}|r`);
				BlzFrameSetText(this.leaderboardNameFrames[i], `${rankColor}${displayName}|r`);
				BlzFrameSetText(this.leaderboardWinRateFrames[i], `${rankColor}${winRate}%|r`);
				BlzFrameSetText(this.leaderboardWinsFrames[i], `${rankColor}${player.wins}|r`);
				BlzFrameSetText(this.leaderboardLossesFrames[i], `${rankColor}${player.losses}|r`);
				BlzFrameSetText(this.leaderboardGamesFrames[i], `${rankColor}${totalGames}|r`);
			} else {
				// Empty slot - clear all columns and hide icon
				BlzFrameSetVisible(this.leaderboardRankIconFrames[i], false);
				BlzFrameSetText(this.leaderboardRankFrames[i], '');
				BlzFrameSetText(this.leaderboardELOFrames[i], '');
				BlzFrameSetText(this.leaderboardNameFrames[i], '');
				BlzFrameSetText(this.leaderboardWinRateFrames[i], '');
				BlzFrameSetText(this.leaderboardWinsFrames[i], '');
				BlzFrameSetText(this.leaderboardLossesFrames[i], '');
				BlzFrameSetText(this.leaderboardGamesFrames[i], '');
			}
		}

		// Update pagination UI
		this.updatePaginationUI();
	}

	private displayNoLeaderboardData(): void {
		// Display "no data available" message in the middle row
		for (let i = 0; i < 10; i++) {
			if (i === 4) {
				// Middle row - show message in name column (centered-ish)
				BlzFrameSetText(this.leaderboardRankFrames[i], '');
				BlzFrameSetText(this.leaderboardELOFrames[i], '');
				BlzFrameSetText(this.leaderboardNameFrames[i], `${HexColors.DARK_GRAY}No data available|r`);
				BlzFrameSetText(this.leaderboardWinRateFrames[i], '');
				BlzFrameSetText(this.leaderboardWinsFrames[i], '');
				BlzFrameSetText(this.leaderboardLossesFrames[i], '');
				BlzFrameSetText(this.leaderboardGamesFrames[i], '');
			} else {
				// Empty rows - clear all columns
				BlzFrameSetText(this.leaderboardRankFrames[i], '');
				BlzFrameSetText(this.leaderboardELOFrames[i], '');
				BlzFrameSetText(this.leaderboardNameFrames[i], '');
				BlzFrameSetText(this.leaderboardWinRateFrames[i], '');
				BlzFrameSetText(this.leaderboardWinsFrames[i], '');
				BlzFrameSetText(this.leaderboardLossesFrames[i], '');
				BlzFrameSetText(this.leaderboardGamesFrames[i], '');
			}
		}

		// Update pagination UI (show page 1/1 with disabled buttons)
		this.totalPages = 1;
		this.currentPage = 0;
		this.updatePaginationUI();
	}

	private previousPage(): void {
		if (this.currentPage > 0) {
			this.currentPage--;
			this.updateLeaderboardData();
		}
	}

	private nextPage(): void {
		if (this.currentPage < this.totalPages - 1) {
			this.currentPage++;
			this.updateLeaderboardData();
		}
	}

	private jumpToMyPlace(): void {
		const ratingManager = RatingManager.getInstance();
		const localBtag = NameManager.getInstance().getBtag(this.player.getPlayer());

		// Get top 500 players only (same as leaderboard display)
		const sortedPlayers = ratingManager.getTop500Players();

		if (sortedPlayers.length === 0) {
			return; // No data available
		}

		// Find local player's index in sorted list
		let myIndex = -1;
		for (let i = 0; i < sortedPlayers.length; i++) {
			if (sortedPlayers[i].btag === localBtag) {
				myIndex = i;
				break;
			}
		}

		// If player not found in leaderboard, do nothing
		if (myIndex === -1) {
			return;
		}

		// Calculate which page the player is on
		const myPage = math.floor(myIndex / this.PLAYERS_PER_PAGE);

		// Jump to that page
		this.currentPage = myPage;
		this.updateLeaderboardData();
	}

	private updatePaginationUI(): void {
		// Update page text
		if (this.leaderboardPageText) {
			BlzFrameSetText(this.leaderboardPageText, `Page ${this.currentPage + 1} / ${this.totalPages}`);
		}

		// Enable/disable prev button
		if (this.leaderboardPrevButton) {
			const canGoPrev = this.currentPage > 0;
			BlzFrameSetEnable(this.leaderboardPrevButton, canGoPrev);
			BlzFrameSetVisible(this.leaderboardPrevButton, true);
		}

		// Enable/disable next button
		if (this.leaderboardNextButton) {
			const canGoNext = this.currentPage < this.totalPages - 1;
			BlzFrameSetEnable(this.leaderboardNextButton, canGoNext);
			BlzFrameSetVisible(this.leaderboardNextButton, true);
		}

		// Enable/disable "My Place" button
		if (this.leaderboardMyPlaceButton) {
			// Check if local player is in the top 500 leaderboard
			const ratingManager = RatingManager.getInstance();
			const localBtag = NameManager.getInstance().getBtag(this.player.getPlayer());
			const sortedPlayers = ratingManager.getTop500Players();

			let playerInLeaderboard = false;
			let playerOnCurrentPage = false;

			if (sortedPlayers.length > 0) {
				// Find local player's index
				let myIndex = -1;
				for (let i = 0; i < sortedPlayers.length; i++) {
					if (sortedPlayers[i].btag === localBtag) {
						myIndex = i;
						playerInLeaderboard = true;
						break;
					}
				}

				// Check if player is on current page
				if (myIndex !== -1) {
					const myPage = math.floor(myIndex / this.PLAYERS_PER_PAGE);
					playerOnCurrentPage = myPage === this.currentPage;
				}
			}

			// Enable button only if player is in leaderboard AND not on current page
			const shouldEnable = playerInLeaderboard && !playerOnCurrentPage;
			BlzFrameSetEnable(this.leaderboardMyPlaceButton, shouldEnable);
			BlzFrameSetVisible(this.leaderboardMyPlaceButton, true);
		}
	}
}
