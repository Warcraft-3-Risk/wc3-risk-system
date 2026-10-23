import { ChatManager } from '../managers/chat-manager';
import { ScoreboardManager } from '../scoreboard/scoreboard-manager';
import { TeamManager } from '../teams/team-manager';
import { HexColors } from '../utils/hex-colors';
import { ErrorMsg } from '../utils/messages';

/**
 * Testing command that sets a team's session wins in promode, e.g. to check the team score display.
 *
 * Only registered in single-player games, so it does not exist in real games.
 * Usage: -setscore <team number> <wins>   e.g. "-setscore 1 11"
 */
export function SetScoreCommand(chatManager: ChatManager) {
	chatManager.addCmd(['-setscore'], () => {
		const sender: player = GetTriggerPlayer();
		const sessionBoard = ScoreboardManager.getInstance().getSessionBoard();

		if (!sessionBoard) return ErrorMsg(sender, 'There is no promode session score yet!');

		const splitStr: string[] = GetEventPlayerChatString()
			.split(' ')
			.filter((str) => str.trim() !== '');

		if (splitStr.length != 3) return ErrorMsg(sender, 'Usage: -setscore <team number> <wins>', 5);

		const team = TeamManager.getInstance().getTeamFromNumber(S2I(splitStr[1]));

		if (!team) return ErrorMsg(sender, 'Team not found!');

		const wins: number = Math.max(0, S2I(splitStr[2]));

		sessionBoard.setTeamWins(team, wins);
		sessionBoard.updateFull();

		DisplayTextToPlayer(sender, 0, 0, `Set the wins of Team #${team.getNumber()} to ${HexColors.TANGERINE}${wins}|r.`);
	});
}
