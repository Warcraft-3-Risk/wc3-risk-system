import { ArenaManager, ArenaMatch } from 'src/app/managers/arena-manager';
import { PlayerManager } from 'src/app/player/player-manager';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { LastResult } from 'src/app/scoreboard/session-board';
import { ReplayManager } from 'src/app/statistics/replay-manager';
import { HexColors } from 'src/app/utils/hex-colors';
import { LocalMessage } from 'src/app/utils/messages';
import { Wait } from 'src/app/utils/wait';
import { ARENA_ROUND_END_DELAY } from 'src/configs/game-settings';
import { NameManager } from 'src/app/managers/names/name-manager';
import { GlobalGameData } from '../../state/global-game-state';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { announceArenaChampion, getArenaLeaders } from './arena-session-end';

/**
 * Ends an Arena round: every unit is frozen, the results go onto the session board, players move along the
 * arena ladder and the next round follows automatically - no -ng needed. Once the session time is up the game ends
 * here with the player with the most wins - or, if several are tied, after deciding rounds between them.
 */
export class ArenaRoundOverState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		this.runAsync();
	}

	async runAsync(): Promise<void> {
		GlobalGameData.matchState = 'postMatch';

		const arenaManager = ArenaManager.getInstance();
		arenaManager.endRound();

		const round = arenaManager.getCurrentRound();

		this.recordResults(round.matches);

		if (arenaManager.isSessionTimeUp()) {
			// Only players still in the game can win - leavers keep their score but are out of the running
			const contenders = GlobalGameData.matchPlayers.filter((p) => GetPlayerSlotState(p.getPlayer()) == PLAYER_SLOT_STATE_PLAYING);
			const leaders = getArenaLeaders(contenders);

			if (leaders.length <= 1) {
				// Session over - no next round
				if (leaders.length == 1) announceArenaChampion(leaders[0]);
				ReplayManager.getInstance().onRoundEnd();
				return;
			}

			// Tied for the most wins: they play deciding rounds among themselves until one is ahead
			arenaManager.setDeciders(leaders);
			this.announceRoundOver(round.number, round.matches, this.describeTie(leaders));
		} else {
			this.announceRoundOver(round.number, round.matches, 'The next round starts shortly...');
			arenaManager.advanceLadder();
		}

		ReplayManager.getInstance().onRoundEnd();

		await Wait.forSeconds(ARENA_ROUND_END_DELAY);

		this.nextState(this.stateData);
	}

	private recordResults(matches: ArenaMatch[]): void {
		const sessionBoard = ScoreboardManager.getInstance().getSessionBoard();

		if (!sessionBoard) return;

		const arenaManager = ArenaManager.getInstance();
		const lastResults = new Map<player, LastResult>();

		// A draw books no win or loss, only the kill values
		matches.forEach((match) => {
			match.players.forEach((p) => lastResults.set(p.getPlayer(), !match.winner ? 'D' : match.winner == p ? 'W' : 'L'));

			if (match.winner) {
				sessionBoard.recordMatchResult(
					[match.winner],
					match.players.filter((p) => p != match.winner)
				);
			}
		});

		sessionBoard.setLastResults(lastResults);

		// The live values are banked now, so clear them before the board adds them on top again
		sessionBoard.clearLiveKillsDeaths();
		GlobalGameData.matchPlayers.forEach((player: ActivePlayer) => {
			const p = player.getPlayer();
			sessionBoard.recordKillsDeaths(player, arenaManager.getRoundKillValue(p), arenaManager.getRoundDeathValue(p));
		});

		sessionBoard.updateFull();
		ScoreboardManager.getInstance().showSessionBoard();
	}

	/**
	 * One message per player: "Round x is over", with the player's own match result on top. When the last match ends
	 * the round, its result would otherwise never be seen. Local messages only, so nothing overlaps.
	 */
	private announceRoundOver(roundNumber: number, matches: ArenaMatch[], nextRound: string): void {
		const arenaManager = ArenaManager.getInstance();
		const roundOver = `${HexColors.TANGERINE}Round ${roundNumber} is over|r\n\n${nextRound}`;
		const announced = new Set<player>();

		matches.forEach((match) => {
			const result = arenaManager.describeResult(match);

			match.players.forEach((activePlayer) => {
				const p = activePlayer.getPlayer();
				announced.add(p);
				LocalMessage(p, `${result}\n\n${roundOver}`, ArenaManager.resultSound(match, activePlayer), ARENA_ROUND_END_DELAY);
			});
		});

		PlayerManager.getInstance().playersAndObservers.forEach((_, p) => {
			if (!announced.has(p)) LocalMessage(p, roundOver, undefined, ARENA_ROUND_END_DELAY);
		});
	}

	/** "Time is up! A and B are tied with 5 wins - a deciding round follows..." */
	private describeTie(leaders: ActivePlayer[]): string {
		const sessionBoard = ScoreboardManager.getInstance().getSessionBoard();
		const names = leaders.map((p) => NameManager.getInstance().getDisplayName(p.getPlayer()));
		const wins = sessionBoard.getWins(leaders[0].getPlayer());
		const nameList = `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

		return `${HexColors.TANGERINE}Time is up!|r ${nameList} are tied with ${wins} wins - a deciding round follows...`;
	}

	// The next round starts automatically
	onPlayerRestart(player: ActivePlayer): void {}
}
