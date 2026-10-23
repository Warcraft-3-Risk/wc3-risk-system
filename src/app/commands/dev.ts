import { ChatManager } from '../managers/chat-manager';
import { HexColors } from '../utils/hex-colors';
import { EDITOR_DEVELOPER_MODE } from 'src/configs/game-settings';

/**
 * Lists the testing commands available in the current game.
 * Only registered in single-player games, like the commands it lists.
 */
export function DevCommand(chatManager: ChatManager) {
	chatManager.addCmd(['-dev'], () => {
		const player: player = GetTriggerPlayer();
		const commands = [
			{ cmd: '-skip', description: 'Skips the starting countdown' },
			{ cmd: '-g #', description: `Adds gold to yourself.\n${HexColors.RED}Example: -g 500|r` },
			{
				cmd: '-createunit [player] [unit]',
				description: `Click the map to place a unit, defaults to a rifleman for your first teammate.\n${HexColors.RED}Example: -createunit blue tank|r`,
			},
			{ cmd: '-setscore team# #', description: `Sets a team's promode session wins.\n${HexColors.RED}Example: -setscore 1 11|r` },
		];

		// Only registered in developer builds
		if (EDITOR_DEVELOPER_MODE) {
			commands.push(
				{ cmd: '-kill playerName/color', description: 'Eliminates a player as if they forfeited' },
				{ cmd: '-dcap playerName/color [#]', description: 'Gives neutral cities to a player (max 10)' }
			);
		}

		const commandsText = commands.map(({ cmd, description }) => `${HexColors.TANGERINE}${cmd}|r ${description}`).join('\n');

		DisplayTimedTextToPlayer(player, 0, 0, 10, `${HexColors.GREEN}Dev commands available:|r\n${commandsText}`);
	});
}
