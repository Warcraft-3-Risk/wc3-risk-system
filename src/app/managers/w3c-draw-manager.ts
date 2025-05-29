import { debugPrint } from '../utils/debug-print';
import { NameManager } from './names/name-manager';
import { GlobalMessage } from '../utils/messages';
import { PlayerManager } from '../player/player-manager';
import { ActivePlayer } from '../player/types/active-player';
import { Wait } from '../utils/wait';
import { W3C_DRAW_DURATION } from 'src/configs/game-settings';

/**
 * Singleton class responsible for managing draw.
 */
export class W3CDrawManager {
	private static instance: W3CDrawManager;
	private playersVoted: Set<player> = new Set();
	private drawActive: boolean = false;
	private drawTimer: timer | null = null;

	private constructor() {}

	static getInstance(): W3CDrawManager {
		if (!W3CDrawManager.instance) {
			W3CDrawManager.instance = new W3CDrawManager();
		}
		return W3CDrawManager.instance;
	}

	startDrawVote(triggeringPlayer: player): void {
		if (this.drawActive && this.playersVoted.has(triggeringPlayer)) {
			debugPrint('[DrawManager] Player already voted for draw.');
			return;
		}

		this.playersVoted.add(triggeringPlayer);
		GlobalMessage(`${NameManager.getInstance().getDisplayName(triggeringPlayer)} has voted for a draw.`, null, 5);

		const humanPlayers = PlayerManager.getInstance().getHumanPlayers();

		// Check if all remaining players agreed
		const allAgreed = humanPlayers.every((p) => this.playersVoted.has(p.getPlayer()));

		if (allAgreed) {
			this.executeDraw(humanPlayers);
			return;
		}

		if (!this.drawActive) {
			this.drawActive = true;
			let secondsElapsed = 0;
			this.drawTimer = CreateTimer();

			TimerStart(this.drawTimer, 1, true, () => {
				secondsElapsed++;

				// If W3C_DRAW_DURATION seconds passed, reset
				if (secondsElapsed >= W3C_DRAW_DURATION) {
					GlobalMessage(`Draw vote expired after ${secondsElapsed} seconds`, null, 5);
					this.resetDrawState();
				}
			});

			debugPrint('[DrawManager] Draw vote started. Timer ticking every second...');
		}
	}

	private async executeDraw(players: ActivePlayer[]) {
		debugPrint('[DrawManager] All players agreed. Executing draw.');

		if (this.drawTimer) {
			PauseTimer(this.drawTimer);
			DestroyTimer(this.drawTimer);
			this.drawTimer = null;
		}

		for (const player of players) {
			await Wait.forSeconds(1); // Optional delay per player
			CustomVictoryBJ(player.getPlayer(), true, true);
		}

		this.resetDrawState();
	}

	private resetDrawState() {
		debugPrint('[DrawManager] Draw vote expired or completed. Resetting state.');
		this.playersVoted.clear();
		this.drawActive = false;
		if (this.drawTimer) {
			PauseTimer(this.drawTimer);
			DestroyTimer(this.drawTimer);
			this.drawTimer = null;
		}
	}
}
