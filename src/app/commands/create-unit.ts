import { GlobalGameData } from '../game/state/global-game-state';
import { ChatManager } from '../managers/chat-manager';
import { MinimapIconManager } from '../managers/minimap-icon-manager';
import { NameManager } from '../managers/names/name-manager';
import { PlayerManager } from '../player/player-manager';
import { TeamManager } from '../teams/team-manager';
import { HexColors } from '../utils/hex-colors';
import { ErrorMsg } from '../utils/messages';
import { UNIT_TYPE } from '../utils/unit-types';
import { UNIT_ID } from 'src/configs/unit-id';

interface PendingPlacement {
	owner: player;
	unitType: number;
	unitName: string;
}

// Units that can be placed, keyed by the name typed after the player
const PLACEABLE_UNITS: Record<string, number> = {
	rifleman: UNIT_ID.RIFLEMEN,
	medic: UNIT_ID.MEDIC,
	mortar: UNIT_ID.MORTAR,
	roarer: UNIT_ID.ROARER,
	knight: UNIT_ID.KNIGHT,
	general: UNIT_ID.GENERAL,
	artillery: UNIT_ID.ARTILLERY,
	tank: UNIT_ID.TANK,
	marine: UNIT_ID.MARINE,
	captain: UNIT_ID.CAPTAIN,
	admiral: UNIT_ID.ADMIRAL,
};

/**
 * Finds the first teammate of the given player, used when no target player is typed.
 */
function getFirstTeammate(sender: player): player | undefined {
	const team = TeamManager.getInstance().getTeamFromPlayer(sender);

	if (!team) return undefined;

	const teammate = team.getMembers().find((member) => member.getPlayer() != sender);

	return teammate ? teammate.getPlayer() : undefined;
}

/**
 * Testing command that places a unit for any player at the next clicked map position,
 * e.g. to get a teammate's unit next to your own city for swap tests.
 *
 * Only registered in single-player games, so it does not exist in real games.
 * Usage: -createunit [player] [unit]   e.g. "-createunit", "-createunit blue", "-createunit blue tank"
 * Without a player it uses your first teammate, without a unit it places a rifleman.
 */
export function CreateUnitCommand(chatManager: ChatManager, nameManager: NameManager) {
	let pending: PendingPlacement | undefined = undefined;

	const clickTrigger: trigger = CreateTrigger();

	for (let i = 0; i < bj_MAX_PLAYERS; i++) {
		TriggerRegisterPlayerEvent(clickTrigger, Player(i), EVENT_PLAYER_MOUSE_DOWN);
	}

	TriggerAddCondition(
		clickTrigger,
		Condition(() => {
			if (!pending) return false;
			if (BlzGetTriggerPlayerMouseButton() != MOUSE_BUTTON_TYPE_LEFT) return false;

			const x: number = BlzGetTriggerPlayerMouseX();
			const y: number = BlzGetTriggerPlayerMouseY();

			// Clicks on UI frames report 0, 0 instead of a map position
			if (x == 0 && y == 0) return false;

			const placement = pending;
			pending = undefined;

			const u: unit = CreateUnit(placement.owner, placement.unitType, x, y, 270);

			// Track it like a trained unit so unit counts stay consistent
			const owner = PlayerManager.getInstance().players.get(placement.owner);

			if (owner && !IsUnitType(u, UNIT_TYPE.TRANSPORT)) owner.trackedData.units.add(u);

			MinimapIconManager.getInstance().registerIfValid(u);

			DisplayTextToPlayer(
				GetTriggerPlayer(),
				0,
				0,
				`Placed a ${HexColors.TANGERINE}${placement.unitName}|r for ${nameManager.getDisplayName(placement.owner)}|r.`
			);

			return false;
		})
	);

	chatManager.addCmd(['-createunit', '-cu'], () => {
		const sender: player = GetTriggerPlayer();

		if (GlobalGameData.matchState != 'inProgress') return ErrorMsg(sender, 'The match has not started yet!');

		const splitStr: string[] = GetEventPlayerChatString()
			.split(' ')
			.filter((str) => str.trim() !== '');

		let owner: player;

		if (splitStr.length >= 2) {
			const players: player[] = nameManager.getPlayersByAnyName(splitStr[1]);

			if (players.length >= 2) return ErrorMsg(sender, 'Multiple players found, be more specific!');
			if (players.length <= 0) return ErrorMsg(sender, 'Player not found!');

			owner = players[0];
		} else {
			owner = getFirstTeammate(sender);

			if (!owner) return ErrorMsg(sender, 'You have no teammate, type a player: -createunit <player> [unit]');
		}

		const unitName: string = splitStr.length >= 3 ? splitStr[2].toLowerCase() : 'rifleman';
		const unitType: number = PLACEABLE_UNITS[unitName];

		if (!unitType) return ErrorMsg(sender, `Unknown unit! Options: ${Object.keys(PLACEABLE_UNITS).join(', ')}`, 5);

		pending = { owner, unitType, unitName };

		DisplayTextToPlayer(
			sender,
			0,
			0,
			`Left click on the map to place a ${HexColors.TANGERINE}${unitName}|r for ${nameManager.getDisplayName(owner)}|r.`
		);
	});
}
