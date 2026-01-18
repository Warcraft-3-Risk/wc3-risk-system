import { ChatManager } from '../managers/chat-manager';
import { HexColors } from '../utils/hex-colors';

export function HelpCommand(chatManager: ChatManager) {
	chatManager.addCmd(['-help', '-commands'], () => {
		const player: player = GetTriggerPlayer();
		const commands = [
			{ cmd: '-tutorial', description: 'Quick tutorial on how to play' },
			{ cmd: '-advanced', description: 'Advanced gameplay tips and tricks' },
			{ cmd: '-cam ####', description: `Changes your camera distance\n${HexColors.RED}Example: -cam 4000|r` },
			{ cmd: '-ui', description: 'Toggles visibility of UI buttons (health, value, labels)' },
			{ cmd: '-ff', description: 'Forfeits the game without leaving it' },
			{ cmd: '-names', description: 'Lists the players still alive in game' },
			{ cmd: '-allies', description: 'Shows your allies with their colors and real names' },
			{
				cmd: '-mute playerName/color',
				description: `Mutes a player for 300 seconds if they are dead.\n${HexColors.RED}Example: -mute blue|r`,
			},
			{ cmd: '-ng', description: 'Restarts the game if it is over' },
			{ cmd: '-gold # playerName/color', description: `Sends gold to the specified ally.\n${HexColors.RED}Example: -gold red 5|r` },
		];

		const commandsText = commands.map(({ cmd, description }) => `${HexColors.TANGERINE}${cmd}|r ${description}`).join('\n');

		DisplayTimedTextToPlayer(
			player,
			0,
			0,
			5,
			`${HexColors.GREEN}Commands available:|r\n${commandsText}`
		);
	});
}
