import { GlobalGameData } from '../game/state/global-game-state';
import { ChatManager } from '../managers/chat-manager';
import { NameManager } from '../managers/names/name-manager';
import { PlayerManager } from '../player/player-manager';
import { SettingsContext } from '../settings/settings-context';
import { HexColors } from '../utils/hex-colors';
import { ErrorMsg } from '../utils/messages';
import { isNonEmptySubstring } from '../utils/utils';

export function GoldCommand(chatManager: ChatManager, nameManager: NameManager) {
	chatManager.addCmd(['-g', '-gold'], () => {
		if (GlobalGameData.matchState != 'inProgress') return;

		const player: player = GetTriggerPlayer();

		const splitStr: string[] = GetEventPlayerChatString()
			.split(' ')
			.filter((str) => str.trim() !== '');

		let goldQty: number;
		const humanPlayersCount: number = PlayerManager.getInstance().getHumanPlayersCount();

		//sandbox behaviour - one human player in the game
		if (humanPlayersCount === 1 && splitStr.length === 2) {
			goldQty = S2I(splitStr[1]);
			SetPlayerState(player, PLAYER_STATE_RESOURCE_GOLD, GetPlayerState(player, PLAYER_STATE_RESOURCE_GOLD) + goldQty);
			return DisplayTextToPlayer(player, 0, 0, `You added ${HexColors.TANGERINE}${goldQty}|r gold to yourself!`);
		}

		if (SettingsContext.getInstance().isFFA()) return;

		const sendersGold: number = GetPlayerState(player, PLAYER_STATE_RESOURCE_GOLD);

		if (sendersGold < 1) return ErrorMsg(player, 'You have no gold to send!');

		if (splitStr.length === 3) {
			goldQty = Math.min(S2I(splitStr[2]), sendersGold);
		} else if (splitStr.length === 2) {
			goldQty = sendersGold;
		} else {
			return ErrorMsg(player, 'Invalid command usage!');
		}

		if (!goldQty) return ErrorMsg(player, 'Invalid gold quantity!');

		const players: player[] = GetAllyByAnyName(splitStr[1], player, nameManager);

		if (players.length >= 2) return ErrorMsg(player, 'Multiple players found, be more specific!');
		if (players.length <= 0) return ErrorMsg(player, 'Player not found!');
		if (players[0] == player) return ErrorMsg(player, "You can't send gold to yourself!");

		SetPlayerState(player, PLAYER_STATE_RESOURCE_GOLD, sendersGold - goldQty);
		SetPlayerState(players[0], PLAYER_STATE_RESOURCE_GOLD, GetPlayerState(players[0], PLAYER_STATE_RESOURCE_GOLD) + goldQty);
		DisplayTextToPlayer(player, 0, 0, `You sent ${HexColors.TANGERINE}${goldQty}|r gold to ${nameManager.getDisplayName(players[0])}|r!`);
		DisplayTextToPlayer(
			players[0],
			0,
			0,
			`You received ${HexColors.TANGERINE}${goldQty}|r gold from ${nameManager.getDisplayName(player)}|r!`
		);
	});
}

function GetAllyByAnyName(string: string, sender: player, nameManager: NameManager): player[] {
	const foundPlayers: Set<player> = new Set<player>();

	for (let i = 0; i < bj_MAX_PLAYERS; i++) {
		const player = Player(i);

		if (!IsPlayerAlly(sender, player)) continue;
		if (GetPlayerSlotState(player) != PLAYER_SLOT_STATE_PLAYING) continue;

		if (isNonEmptySubstring(string, nameManager.getColor(player))) {
			foundPlayers.add(player);
		}

		if (isNonEmptySubstring(string, nameManager.getBtag(player))) {
			foundPlayers.add(player);
		}
	}

	return [...foundPlayers];
}
