import { ChatManager } from '../managers/chat-manager';
import { HexColors } from '../utils/hex-colors';

export function HelpCommand(chatManager: ChatManager) {
	chatManager.addCmd(['-help', '-commands'], () => {
		const player: player = GetTriggerPlayer();
		const commands = [
			{ cmd: '-tutorial', description: 'Quick tutorial on how to play' },
			{ cmd: '-advanced', description: 'Advanced gameplay tips and tricks' },
			{ cmd: '-cam ####', description: 'Changes your camera distance' },
			{ cmd: '-ui', description: 'Toggles visibility of UI buttons (health, value, labels)' },
			{ cmd: '-ff', description: 'Forfeits the game without leaving it' },
			{ cmd: '-names', description: 'Lists the players still alive in game' },
			{ cmd: '-allies', description: 'Shows your allies with their colors and real names' },
			{
				cmd: '-mute playerName/color',
				description: `Mutes a player for 300 seconds if they are dead.\n${HexColors.RED}Example: -mute blue|r`,
			},
			{ cmd: '-ng', description: 'Restarts the game if it is over' },
			{ cmd: '-colorblind', description: 'Shows teammates yellow instead of teal on the promode minimap' },
			{ cmd: '-gold playerName/color #', description: `Sends gold to the specified ally.\n${HexColors.RED}Example: -gold red 5|r` },
			{ cmd: '-gold #', description: `Asks your team for gold. ${HexColors.TANGERINE}-y|r accepts, ${HexColors.TANGERINE}-n|r dismisses` },
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
