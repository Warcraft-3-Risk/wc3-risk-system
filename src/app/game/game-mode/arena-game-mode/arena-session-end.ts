import { NameManager } from 'src/app/managers/names/name-manager';
import { PlayerManager } from 'src/app/player/player-manager';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { HexColors } from 'src/app/utils/hex-colors';
import { LocalMessage } from 'src/app/utils/messages';

/** The players with the most session wins - more than one means they are tied. */
export function getArenaLeaders(players: ActivePlayer[]): ActivePlayer[] {
	const sessionBoard = ScoreboardManager.getInstance().getSessionBoard();

	if (!sessionBoard) return [];

	let mostWins = -1;
	let leaders: ActivePlayer[] = [];

	players.forEach((player) => {
		const wins = sessionBoard.getWins(player.getPlayer());

		if (wins > mostWins) {
			mostWins = wins;
			leaders = [player];
		} else if (wins == mostWins) {
			leaders.push(player);
		}
	});

	return leaders;
}

/** Ends the arena session: shows the final score and announces the winner. No further round is started. */
export function announceArenaChampion(champion: ActivePlayer): void {
	const sessionBoard = ScoreboardManager.getInstance().getSessionBoard();
	const name = NameManager.getInstance().getDisplayName(champion.getPlayer());
	const wins = sessionBoard ? sessionBoard.getWins(champion.getPlayer()) : 0;
	const message = `${HexColors.TANGERINE}Time is up!|r\n\n${name} ${HexColors.TANGERINE}wins the arena with ${wins} wins!|r`;

	if (sessionBoard) {
		sessionBoard.setTitle('Arena - Final Score');
		sessionBoard.updateFull();
	}
	ScoreboardManager.getInstance().showSessionBoard();

	PlayerManager.getInstance().playersAndObservers.forEach((_, p) => {
		const sound = p == champion.getPlayer() ? 'Sound\\Interface\\QuestCompleted.flac' : 'Sound\\Interface\\QuestFailed.flac';
		LocalMessage(p, message, sound, 60);
	});
}
