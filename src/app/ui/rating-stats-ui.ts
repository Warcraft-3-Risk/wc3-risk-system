import { ActivePlayer } from '../player/types/active-player';
import { HexColors } from '../utils/hex-colors';
import { RatingManager } from '../rating/rating-manager';
import { getRankIcon } from '../rating/rating-calculator';
import { NameManager } from '../managers/names/name-manager';
import { debugPrint } from '../utils/debug-print';
import { readGlobalRatings } from '../rating/global-rating-handler';
import { RANKED_SEASON_ID } from 'src/configs/game-settings';

export class RatingStatsUI {
	private player: ActivePlayer;
	private frameBackdrop: framehandle | null = null;
	private isVisible: boolean = false;
	private rankIconBadge: framehandle | null = null;
	private ratingText: framehandle | null = null;
	private gamesText: framehandle | null = null;
	private winBarFill: framehandle | null = null;
	private winPercentText: framehandle | null = null;
	private toggleButton: framehandle | null = null;
	private closeButton: framehandle | null = null;
	private top10Frame: framehandle | null = null;
	private top10CloseButton: framehandle | null = null;
	private top10RankIconFrames: framehandle[] = [];
	private top10RankFrames: framehandle[] = [];
	private top10ELOFrames: framehandle[] = [];
	private top10NameFrames: framehandle[] = [];
	private top10WinRateFrames: framehandle[] = [];
	private top10WinsFrames: framehandle[] = [];
	private top10LossesFrames: framehandle[] = [];
	private top10GamesFrames: framehandle[] = [];
	private top10PrevButton: framehandle | null = null;
	private top10NextButton: framehandle | null = null;
	private top10PageText: framehandle | null = null;
	private isTop10Visible: boolean = false;
	private isInitialized: boolean = false;
	private isTop10Initialized: boolean = false;
	private currentPage: number = 0;
	private totalPages: number = 1;
	private readonly PLAYERS_PER_PAGE: number = 10;

	constructor(player: ActivePlayer) {
		this.player = player;
		// Initialize frames when first needed
	}

	private initializeFrames(): void {
		if (this.isInitialized) {
			return;
		}

		try {
			// Create the main frame from FDF definition
			this.frameBackdrop = BlzCreateFrame('RatingStatsFrame', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);

			// Get child frame references
			this.rankIconBadge = BlzGetFrameByName('RankIconBadge', 0);
			this.ratingText = BlzGetFrameByName('RatingValueText', 0);
			this.gamesText = BlzGetFrameByName('GamesPlayedText', 0);
			this.winBarFill = BlzGetFrameByName('WinBarFill', 0);
			this.winPercentText = BlzGetFrameByName('WinPercentText', 0);
			this.toggleButton = BlzGetFrameByName('RatingToggleButton', 0);
			this.closeButton = BlzGetFrameByName('RatingCloseButton', 0);

			if (!this.frameBackdrop || !this.toggleButton) {
				return;
			}

			// Register toggle button click event for Top 10
			const toggleTrigger = CreateTrigger();
			BlzTriggerRegisterFrameEvent(toggleTrigger, this.toggleButton, FRAMEEVENT_CONTROL_CLICK);
			TriggerAddAction(toggleTrigger, () => {
				if (GetLocalPlayer() == this.player.getPlayer()) {
					this.toggleTop10Display();
				}
			});

			// Register close button click event
			if (this.closeButton) {
				const closeTrigger = CreateTrigger();
				BlzTriggerRegisterFrameEvent(closeTrigger, this.closeButton, FRAMEEVENT_CONTROL_CLICK);
				TriggerAddAction(closeTrigger, () => {
					if (GetLocalPlayer() == this.player.getPlayer()) {
						this.hide();
					}
				});
			}

			// Initially hide the frame
			BlzFrameSetEnable(this.frameBackdrop, false);
			BlzFrameSetVisible(this.frameBackdrop, false);

			this.isInitialized = true;
			this.updateStatsFromManager();
		} catch (error) {
			// Silent fail - frame creation error
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
			if (this.frameBackdrop) {
				BlzFrameSetEnable(this.frameBackdrop, true);
				BlzFrameSetVisible(this.frameBackdrop, true);
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
		if(this.isTop10Visible) {
			this.toggleTop10Display();
		}

		if (this.isVisible) {
			this.hide();
		} else {
			this.show();
		}
	}

	public refresh(): void {
		if (GetLocalPlayer() == this.player.getPlayer()) {
			debugPrint(`RatingStatsUI.refresh() called for player ${GetPlayerId(this.player.getPlayer())}, initialized: ${this.isInitialized}, visible: ${this.isVisible}`);
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
		if (!this.isInitialized) return;

		const ratingManager = RatingManager.getInstance();
		const btag = NameManager.getInstance().getBtag(this.player.getPlayer());
		const playerData = ratingManager.getPlayerData(btag);

		debugPrint(`RatingStatsUI.updateStatsFromManager() - btag: ${btag}, hasPlayerData: ${playerData !== null}, hasPendingGame: ${playerData && playerData.pendingGame ? 'yes' : 'no'}`);

		// If there's a pending game (ranked game in progress), display those values
		if (playerData && playerData.pendingGame) {
			this.updateStatsFromPendingGame(playerData);
		}
		// Otherwise, show current stats
		else {
			this.updateStats(playerData);
		}
	}

	private updateStatsFromPendingGame(playerData: any): void {
		if (!this.isInitialized || !playerData || !playerData.pendingGame) return;

		const pending = playerData.pendingGame;

		// Rating (show pending rating)
		this.updateRankIcon(pending.rating);
		if (this.ratingText) BlzFrameSetText(this.ratingText, `${HexColors.TANGERINE}Rating:|r ${HexColors.WHITE}${pending.rating}|r`);

		// Games played (show pending games count)
		if (this.gamesText) BlzFrameSetText(this.gamesText, `${HexColors.TANGERINE}Games Played:|r ${HexColors.WHITE}${pending.gamesPlayed}|r`);

		// Win/Loss (show pending stats)
		const totalGames = pending.wins + pending.losses;
		const winPercent = totalGames > 0 ? math.floor((pending.wins / totalGames) * 100) : 0;
		const winBarWidth = totalGames > 0 ? (pending.wins / totalGames) * 0.21 : 0;

		if (this.winPercentText) BlzFrameSetText(this.winPercentText, `${pending.wins}W / ${pending.losses}L (${winPercent}%)`);
		if (this.winBarFill) BlzFrameSetSize(this.winBarFill, winBarWidth, 0.02);
	}

	private updateStats(playerData: any): void {
		if (!this.isInitialized) return;

		if (!playerData) {
			// No data yet - show starting rating
			this.updateRankIcon(1000);
			if (this.ratingText) BlzFrameSetText(this.ratingText, `${HexColors.TANGERINE}Rating:|r ${HexColors.WHITE}1000|r`);
			if (this.gamesText) BlzFrameSetText(this.gamesText, `${HexColors.TANGERINE}Games Played:|r ${HexColors.WHITE}0|r`);
			if (this.winPercentText) BlzFrameSetText(this.winPercentText, `0W / 0L (0%)`);
			if (this.winBarFill) BlzFrameSetSize(this.winBarFill, 0, 0.02);
			return;
		}

		// Rating
		this.updateRankIcon(playerData.rating);
		if (this.ratingText) BlzFrameSetText(this.ratingText, `${HexColors.TANGERINE}Rating:|r ${HexColors.WHITE}${playerData.rating}|r`);

		// Games played
		if (this.gamesText) BlzFrameSetText(this.gamesText, `${HexColors.TANGERINE}Games Played:|r ${HexColors.WHITE}${playerData.gamesPlayed}|r`);

		// Win/Loss
		const totalGames = playerData.wins + playerData.losses;
		const winPercent = totalGames > 0 ? math.floor((playerData.wins / totalGames) * 100) : 0;
		const winBarWidth = totalGames > 0 ? (playerData.wins / totalGames) * 0.21 : 0;

		if (this.winPercentText) BlzFrameSetText(this.winPercentText, `${playerData.wins}W / ${playerData.losses}L (${winPercent}%)`);
		if (this.winBarFill) BlzFrameSetSize(this.winBarFill, winBarWidth, 0.02);
	}

	public toggleTop10Display(): void {
		if (this.isTop10Visible) {
			this.hideTop10();
		} else {
			this.showTop10();
		}
	}

	public showTop10(): void {
		if (!this.isInitialized) return;

		// Initialize top 10 frame if needed
		if (!this.isTop10Initialized) {
			this.initializeTop10Frame();
		}

		if (!this.isTop10Initialized) return;

		// Hide rating stats window
		if (this.frameBackdrop) {
			BlzFrameSetVisible(this.frameBackdrop, false);
			BlzFrameSetEnable(this.frameBackdrop, false);
		}

		// Show top 10 window
		if (this.top10Frame) {
			BlzFrameSetVisible(this.top10Frame, true);
			BlzFrameSetEnable(this.top10Frame, true);
		}

		// Reset to first page
		this.currentPage = 0;

		// Load and display top 10 data
		this.updateTop10Data();

		this.isTop10Visible = true;
	}

	private hideTop10(): void {
		// Hide top 10 window
		if (this.top10Frame) {
			BlzFrameSetVisible(this.top10Frame, false);
			BlzFrameSetEnable(this.top10Frame, false);
		}

		// Show rating stats window
		if (this.frameBackdrop) {
			BlzFrameSetVisible(this.frameBackdrop, true);
			BlzFrameSetEnable(this.frameBackdrop, true);
		}

		this.isTop10Visible = false;
	}

	private initializeTop10Frame(): void {
		try {
			// Create the top 10 frame from FDF definition
			this.top10Frame = BlzCreateFrame('Top10LeaderboardFrame', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);

			if (!this.top10Frame) {
				return;
			}

			// Get close button reference
			this.top10CloseButton = BlzGetFrameByName('Top10CloseButton', 0);

			// Register close button click event
			if (this.top10CloseButton) {
				const closeTop10Trigger = CreateTrigger();
				BlzTriggerRegisterFrameEvent(closeTop10Trigger, this.top10CloseButton, FRAMEEVENT_CONTROL_CLICK);
				TriggerAddAction(closeTop10Trigger, () => {
					if (GetLocalPlayer() == this.player.getPlayer()) {
						this.hideTop10();
					}
				});
			}

			// Get pagination button references
			this.top10PrevButton = BlzGetFrameByName('Top10PrevButton', 0);
			this.top10NextButton = BlzGetFrameByName('Top10NextButton', 0);
			this.top10PageText = BlzGetFrameByName('Top10PageText', 0);

			// Register pagination button click events
			if (this.top10PrevButton) {
				const prevTrigger = CreateTrigger();
				BlzTriggerRegisterFrameEvent(prevTrigger, this.top10PrevButton, FRAMEEVENT_CONTROL_CLICK);
				TriggerAddAction(prevTrigger, () => {
					if (GetLocalPlayer() == this.player.getPlayer()) {
						this.previousPage();
					}
				});
			}

			if (this.top10NextButton) {
				const nextTrigger = CreateTrigger();
				BlzTriggerRegisterFrameEvent(nextTrigger, this.top10NextButton, FRAMEEVENT_CONTROL_CLICK);
				TriggerAddAction(nextTrigger, () => {
					if (GetLocalPlayer() == this.player.getPlayer()) {
						this.nextPage();
					}
				});
			}

			// Create 10 rows of column frames for player entries dynamically
			let yOffset = -0.085;
			for (let i = 0; i < 10; i++) {
				// Rank column
				const rankFrame = BlzCreateFrameByType('TEXT', `Top10PlayerRank${i}`, this.top10Frame, '', 0);
				BlzFrameSetPoint(rankFrame, FRAMEPOINT_TOPLEFT, this.top10Frame, FRAMEPOINT_TOPLEFT, 0.01, yOffset);
				BlzFrameSetSize(rankFrame, 0.023, 0.02);
				BlzFrameSetText(rankFrame, '');
				BlzFrameSetTextAlignment(rankFrame, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
				this.top10RankFrames.push(rankFrame);


				// Rank icon (before ELO)
				const rankIconFrame = BlzCreateFrameByType('BACKDROP', `Top10PlayerRankIcon${i}`, this.top10Frame, '', 0);
				BlzFrameSetPoint(rankIconFrame, FRAMEPOINT_TOPLEFT, this.top10Frame, FRAMEPOINT_TOPLEFT, 0.048, yOffset + 0.0025);
				BlzFrameSetSize(rankIconFrame, 0.015, 0.015);
				this.top10RankIconFrames.push(rankIconFrame);

				// ELO column
				const eloFrame = BlzCreateFrameByType('TEXT', `Top10PlayerELO${i}`, this.top10Frame, '', 0);
				BlzFrameSetPoint(eloFrame, FRAMEPOINT_TOPLEFT, this.top10Frame, FRAMEPOINT_TOPLEFT, 0.065, yOffset);
				BlzFrameSetSize(eloFrame, 0.05, 0.02);
				BlzFrameSetText(eloFrame, '');
				BlzFrameSetTextAlignment(eloFrame, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
				this.top10ELOFrames.push(eloFrame);

				// Name column
				const nameFrame = BlzCreateFrameByType('TEXT', `Top10PlayerName${i}`, this.top10Frame, '', 0);
				BlzFrameSetPoint(nameFrame, FRAMEPOINT_TOPLEFT, this.top10Frame, FRAMEPOINT_TOPLEFT, 0.10, yOffset);
				BlzFrameSetSize(nameFrame, 0.15, 0.02);
				BlzFrameSetText(nameFrame, '');
				BlzFrameSetTextAlignment(nameFrame, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
				this.top10NameFrames.push(nameFrame);

				// Win Rate column
				const winRateFrame = BlzCreateFrameByType('TEXT', `Top10PlayerWinRate${i}`, this.top10Frame, '', 0);
				BlzFrameSetPoint(winRateFrame, FRAMEPOINT_TOPLEFT, this.top10Frame, FRAMEPOINT_TOPLEFT, 0.25, yOffset);
				BlzFrameSetSize(winRateFrame, 0.07, 0.02);
				BlzFrameSetText(winRateFrame, '');
				BlzFrameSetTextAlignment(winRateFrame, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
				this.top10WinRateFrames.push(winRateFrame);

				// Wins column
				const winsFrame = BlzCreateFrameByType('TEXT', `Top10PlayerWins${i}`, this.top10Frame, '', 0);
				BlzFrameSetPoint(winsFrame, FRAMEPOINT_TOPLEFT, this.top10Frame, FRAMEPOINT_TOPLEFT, 0.33, yOffset);
				BlzFrameSetSize(winsFrame, 0.05, 0.02);
				BlzFrameSetText(winsFrame, '');
				BlzFrameSetTextAlignment(winsFrame, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
				this.top10WinsFrames.push(winsFrame);

				// Losses column
				const lossesFrame = BlzCreateFrameByType('TEXT', `Top10PlayerLosses${i}`, this.top10Frame, '', 0);
				BlzFrameSetPoint(lossesFrame, FRAMEPOINT_TOPLEFT, this.top10Frame, FRAMEPOINT_TOPLEFT, 0.39, yOffset);
				BlzFrameSetSize(lossesFrame, 0.05, 0.02);
				BlzFrameSetText(lossesFrame, '');
				BlzFrameSetTextAlignment(lossesFrame, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
				this.top10LossesFrames.push(lossesFrame);

				// Games column
				const gamesFrame = BlzCreateFrameByType('TEXT', `Top10PlayerGames${i}`, this.top10Frame, '', 0);
				BlzFrameSetPoint(gamesFrame, FRAMEPOINT_TOPLEFT, this.top10Frame, FRAMEPOINT_TOPLEFT, 0.45, yOffset);
				BlzFrameSetSize(gamesFrame, 0.05, 0.02);
				BlzFrameSetText(gamesFrame, '');
				BlzFrameSetTextAlignment(gamesFrame, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
				this.top10GamesFrames.push(gamesFrame);

				yOffset -= 0.022;
			}

			// Initially hide the top 10 frame
			BlzFrameSetEnable(this.top10Frame, false);
			BlzFrameSetVisible(this.top10Frame, false);

			this.isTop10Initialized = true;
		} catch (error) {
			// Silent fail
		}
	}

	private updateTop10Data(): void {
		const ratingManager = RatingManager.getInstance();
		const isDeveloperMode = ratingManager.isDeveloperModeEnabled();

		// Try to load global ratings database first
		let globalData = readGlobalRatings(RANKED_SEASON_ID, isDeveloperMode);

		// If global data doesn't exist, fall back to loaded players from current session
		if (!globalData || globalData.players.length === 0) {
			const loadedPlayers = ratingManager.getAllLoadedPlayers();

			if (loadedPlayers.length === 0) {
				this.displayNoTop10Data();
				return;
			}

			// Create a temporary global data structure from loaded players
			globalData = {
				version: 1,
				seasonId: RANKED_SEASON_ID,
				checksum: '',
				players: loadedPlayers,
				playerCount: loadedPlayers.length,
			};
		}

		// Sort players by rating descending
		const sortedPlayers = globalData.players.slice().sort((a, b) => {
			if (b.rating !== a.rating) {
				return b.rating - a.rating;
			}
			// Tiebreaker: more games played wins
			if (b.gamesPlayed !== a.gamesPlayed) {
				return b.gamesPlayed - a.gamesPlayed;
			}
			// Final tiebreaker: alphabetical
			if (a.btag < b.btag) return -1;
			if (a.btag > b.btag) return 1;
			return 0;
		});

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

		// Update each row's column frames
		for (let i = 0; i < 10; i++) {
			if (i < currentPagePlayers.length) {
				const player = currentPagePlayers[i];
				const rank = startIndex + i + 1;

				// Get rank color
				let rankColor = HexColors.WHITE;
				if (rank === 1) {
					rankColor = HexColors.TANGERINE; // Gold
				} else if (rank === 2) {
					rankColor = HexColors.LIGHT_GRAY; // Silver
				} else if (rank === 3) {
					rankColor = HexColors.ORANGE; // Bronze
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
				BlzFrameSetTexture(this.top10RankIconFrames[i], rankIconPath, 0, true);
				BlzFrameSetVisible(this.top10RankIconFrames[i], true);

				// Set each column
				BlzFrameSetText(this.top10RankFrames[i], `${rankColor}${rank}|r`);
				BlzFrameSetText(this.top10ELOFrames[i], `${rankColor}${rating}|r`);
				BlzFrameSetText(this.top10NameFrames[i], `${rankColor}${displayName}|r`);
				BlzFrameSetText(this.top10WinRateFrames[i], `${rankColor}${winRate}%|r`);
				BlzFrameSetText(this.top10WinsFrames[i], `${rankColor}${player.wins}|r`);
				BlzFrameSetText(this.top10LossesFrames[i], `${rankColor}${player.losses}|r`);
				BlzFrameSetText(this.top10GamesFrames[i], `${rankColor}${totalGames}|r`);
			} else {
				// Empty slot - clear all columns and hide icon
				BlzFrameSetVisible(this.top10RankIconFrames[i], false);
				BlzFrameSetText(this.top10RankFrames[i], '');
				BlzFrameSetText(this.top10ELOFrames[i], '');
				BlzFrameSetText(this.top10NameFrames[i], '');
				BlzFrameSetText(this.top10WinRateFrames[i], '');
				BlzFrameSetText(this.top10WinsFrames[i], '');
				BlzFrameSetText(this.top10LossesFrames[i], '');
				BlzFrameSetText(this.top10GamesFrames[i], '');
			}
		}

		// Update pagination UI
		this.updatePaginationUI();
	}

	private displayNoTop10Data(): void {
		// Display "no data available" message in the middle row
		for (let i = 0; i < 10; i++) {
			if (i === 4) {
				// Middle row - show message in name column (centered-ish)
				BlzFrameSetText(this.top10RankFrames[i], '');
				BlzFrameSetText(this.top10ELOFrames[i], '');
				BlzFrameSetText(this.top10NameFrames[i], `${HexColors.DARK_GRAY}No data available|r`);
				BlzFrameSetText(this.top10WinRateFrames[i], '');
				BlzFrameSetText(this.top10WinsFrames[i], '');
				BlzFrameSetText(this.top10LossesFrames[i], '');
				BlzFrameSetText(this.top10GamesFrames[i], '');
			} else {
				// Empty rows - clear all columns
				BlzFrameSetText(this.top10RankFrames[i], '');
				BlzFrameSetText(this.top10ELOFrames[i], '');
				BlzFrameSetText(this.top10NameFrames[i], '');
				BlzFrameSetText(this.top10WinRateFrames[i], '');
				BlzFrameSetText(this.top10WinsFrames[i], '');
				BlzFrameSetText(this.top10LossesFrames[i], '');
				BlzFrameSetText(this.top10GamesFrames[i], '');
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
			this.updateTop10Data();
		}
	}

	private nextPage(): void {
		if (this.currentPage < this.totalPages - 1) {
			this.currentPage++;
			this.updateTop10Data();
		}
	}

	private updatePaginationUI(): void {
		// Update page text
		if (this.top10PageText) {
			BlzFrameSetText(this.top10PageText, `Page ${this.currentPage + 1} / ${this.totalPages}`);
		}

		// Enable/disable prev button
		if (this.top10PrevButton) {
			const canGoPrev = this.currentPage > 0;
			BlzFrameSetEnable(this.top10PrevButton, canGoPrev);
			BlzFrameSetVisible(this.top10PrevButton, true);
		}

		// Enable/disable next button
		if (this.top10NextButton) {
			const canGoNext = this.currentPage < this.totalPages - 1;
			BlzFrameSetEnable(this.top10NextButton, canGoNext);
			BlzFrameSetVisible(this.top10NextButton, true);
		}
	}

}
