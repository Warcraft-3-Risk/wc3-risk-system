import { TeamManager } from '../teams/team-manager';
import { ChatManager } from '../managers/chat-manager';
import { NameManager } from '../managers/names/name-manager';
import { HexColors } from '../utils/hex-colors';

export function AlliesCommand(chatManager: ChatManager, nameManager: NameManager) {
	chatManager.addCmd(['-allies', '-ally'], () => {
		const player: player = GetTriggerPlayer();
		const teamManager = TeamManager.getInstance();
		const team = teamManager.getTeamFromPlayer(player);

		// Check if player has a team
		if (!team) {
			DisplayTextToPlayer(player, 0, 0, `${HexColors.RED}You are not in a team.|r`);
			return;
		}

		const teamMembers = team.getMembers();

		// Check if player has allies (team has more than just themselves)
		if (teamMembers.length <= 1) {
			DisplayTextToPlayer(player, 0, 0, `${HexColors.RED}You have no allies in this game.|r`);
			return;
		}

		// Build the allies list
		let alliesText = `${HexColors.GREEN}Your allies:|r\n`;

		teamMembers.forEach((member) => {
			const allyPlayer = member.getPlayer();

			// Skip the player themselves
			if (allyPlayer === player) return;

			const colorCode = nameManager.getColorCode(allyPlayer);
			const colorName = nameManager.getColor(allyPlayer);
			const btag = nameManager.getBtag(allyPlayer);

			alliesText += `${colorCode}${colorName}|r - ${btag}\n`;
		});

		// Display only to the player who typed the command
		DisplayTimedTextToPlayer(player, 0, 0, 5, alliesText);
	});
}
