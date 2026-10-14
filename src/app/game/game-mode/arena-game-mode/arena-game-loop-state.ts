import { ArenaManager, ArenaMatch } from 'src/app/managers/arena-manager';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { ReplayManager } from 'src/app/statistics/replay-manager';
import { debugPrint } from 'src/app/utils/debug-print';
import { HexColors } from 'src/app/utils/hex-colors';
import { PLAYER_STATUS } from 'src/app/player/status/status-enum';
import { LocalMessage } from 'src/app/utils/messages';
import { PlayGlobalSound } from 'src/app/utils/utils';
import { ARENA_ROUND_DURATION } from 'src/configs/game-settings';
import { GlobalGameData } from '../../state/global-game-state';
import { setTickUI } from '../utillity/update-ui';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';

const CHECK_INTERVAL: number = 0.25;
const CHECKS_PER_SECOND: number = 4;

/**
 * An Arena round in progress. Every match ends as soon as one side has no units left; when the round timer
 * (top right) runs out, all remaining matches are decided by kill value. The round is over once every match
 * is decided. There is no income, no spawners and no turns.
 */
export class ArenaGameLoopState<T extends StateData> extends BaseState<T> {
	private loopTimer: timer = undefined;

	onEnterState() {
		GlobalGameData.matchState = 'inProgress';
		ReplayManager.getInstance().onRoundStart();

		let checks = 0;
		let secondsLeft = ARENA_ROUND_DURATION;
		this.updateTimer(secondsLeft);

		this.loopTimer = CreateTimer();

		TimerStart(this.loopTimer, CHECK_INTERVAL, true, () => {
			try {
				checks++;

				if (checks % CHECKS_PER_SECOND == 0) {
					secondsLeft--;
					this.updateTimer(secondsLeft);
					this.refreshLiveScore();
				}

				this.checkMatches(secondsLeft <= 0);
			} catch (error) {
				debugPrint('Error in ArenaGameLoopState ' + error);
			}
		});
	}

	onExitState(): void {
		if (this.loopTimer) {
			PauseTimer(this.loopTimer);
			DestroyTimer(this.loopTimer);
			this.loopTimer = undefined;
		}

		GlobalGameData.matchState = 'postMatch';
	}

	onUnitKilled(killingUnit: unit, dyingUnit: unit): void {
		ArenaManager.getInstance().onUnitKilled(killingUnit, dyingUnit);
	}

	private checkMatches(timeUp: boolean): void {
		if (GlobalGameData.matchState != 'inProgress') return;

		const arenaManager = ArenaManager.getInstance();
		const round = arenaManager.getCurrentRound();
		const justDecided: ArenaMatch[] = [];
		let allDecided = true;

		round.matches.forEach((match) => {
			if (match.decided) return;

			if (arenaManager.tryDecide(match, timeUp)) {
				justDecided.push(match);
			} else {
				allDecided = false;
			}
		});

		// When this ends the whole round, the round summary follows right away - a separate result message would overlap it
		if (!allDecided) {
			justDecided.forEach((match) => this.announceMatch(match));
		}

		if (allDecided) {
			this.refreshLiveScore();
			this.nextState(this.stateData);
		}
	}

	/** Tells both players of a finished match how it went - the round summary follows once every match is over. */
	private announceMatch(match: ArenaMatch): void {
		const result = ArenaManager.getInstance().describeResult(match);

		match.players.forEach((activePlayer) => {
			LocalMessage(activePlayer.getPlayer(), result, ArenaManager.resultSound(match, activePlayer), 4);
		});
	}

	private updateTimer(secondsLeft: number): void {
		const seconds = Math.max(secondsLeft, 0);
		const text = seconds <= 10 ? `${HexColors.RED}${seconds}|r` : `${seconds}`;

		if (seconds > 0 && seconds <= 3) {
			PlayGlobalSound('Sound\\Interface\\BattleNetTick.flac');
		}

		setTickUI(text, `${ArenaManager.getInstance().getRoundNumber()}`);
	}

	/** Shows the kill values of the round in progress (gold cost of the units killed and lost) on the session board. */
	private refreshLiveScore(): void {
		const sessionBoard = ScoreboardManager.getInstance().getSessionBoard();

		if (!sessionBoard) return;

		const arenaManager = ArenaManager.getInstance();

		GlobalGameData.matchPlayers.forEach((player) => {
			const p = player.getPlayer();
			sessionBoard.setLiveKillsDeaths(player, arenaManager.getRoundKillValue(p), arenaManager.getRoundDeathValue(p));
		});

		sessionBoard.setTitle(arenaManager.getSessionTitle());

		sessionBoard.updateFull();
	}

	// A forfeit (or any other death) only gives up the current round - the match result message says who won,
	// so the usual global "has been defeated/forfeited" message is left out
	onPlayerDead(player: ActivePlayer, forfeit?: boolean): void {
		if (player.status.isEliminated()) return;

		player.status.status = PLAYER_STATUS.DEAD;
	}

	// Losing the city does not matter in the arena - only the army does, so a player without a city is not a nomad
	onPlayerNomad(player: ActivePlayer): void {}

	// Rounds end on their own - there is nothing to restart
	onPlayerRestart(player: ActivePlayer): void {}
}
