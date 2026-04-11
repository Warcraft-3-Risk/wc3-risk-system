import { GlobalGameData } from '../game/state/global-game-state';
import { ChatManager } from '../managers/chat-manager';
import { NameManager } from '../managers/names/name-manager';
import { PlayerManager } from '../player/player-manager';
import { SettingsContext } from '../settings/settings-context';
import { TeamManager } from '../teams/team-manager';
import { HexColors } from '../utils/hex-colors';
import { ErrorMsg } from '../utils/messages';

interface GoldRequest {
	requester: player;
	amount: number;
	timer: timer;
}

// Active gold requests keyed by the requesting player
const activeRequests: Map<player, GoldRequest> = new Map();

function clearRequest(requester: player): void {
	const request = activeRequests.get(requester);
	if (request) {
		PauseTimer(request.timer);
		DestroyTimer(request.timer);
		activeRequests.set(requester, undefined);
		activeRequests.delete(requester);
	}
}

function getTeammateRequest(responder: player): GoldRequest | undefined {
	const responderTeam = TeamManager.getInstance().getTeamFromPlayer(responder);
	if (!responderTeam) return undefined;

	for (const [, request] of activeRequests) {
		if (request && request.requester !== responder && responderTeam.playerIsInTeam(request.requester)) {
			return request;
		}
	}
	return undefined;
}

function isTeamMode(): boolean {
	return !SettingsContext.getInstance().isFFA();
}

function isSingleplayer(): boolean {
	return PlayerManager.getInstance().getHumanPlayersCount() === 1;
}

export function GoldCommand(chatManager: ChatManager, nameManager: NameManager) {
	chatManager.addCmd(['-g', '-gold'], () => {
		if (GlobalGameData.matchState !== 'inProgress') return;

		const player: player = GetTriggerPlayer();

		const splitStr: string[] = GetEventPlayerChatString()
			.split(' ')
			.filter((str) => str.trim() !== '');

		let goldQty: number;

		// Sandbox behaviour - one human player in the game
		if (isSingleplayer() && splitStr.length === 2) {
			goldQty = S2I(splitStr[1]);
			SetPlayerState(player, PLAYER_STATE_RESOURCE_GOLD, GetPlayerState(player, PLAYER_STATE_RESOURCE_GOLD) + goldQty);
			return DisplayTextToPlayer(player, 0, 0, `You added ${HexColors.TANGERINE}${goldQty}|r gold to yourself!`);
		}

		if (!isTeamMode()) return;

		// "-g <amount>" with just a number = gold request to teammates
		if (splitStr.length === 2) {
			goldQty = S2I(splitStr[1]);
			if (!goldQty || goldQty <= 0) return ErrorMsg(player, 'Invalid gold quantity!');

			createGoldRequest(player, goldQty, nameManager);
			return;
		}

		// "-g <name> [amount]" = direct gold transfer (existing behaviour)
		const sendersGold: number = GetPlayerState(player, PLAYER_STATE_RESOURCE_GOLD);

		if (sendersGold < 1) return ErrorMsg(player, 'You have no gold to send!');

		if (splitStr.length === 3) {
			goldQty = Math.min(S2I(splitStr[2]), sendersGold);
		} else {
			return ErrorMsg(player, 'Invalid command usage!');
		}

		if (!goldQty) return ErrorMsg(player, 'Invalid gold quantity!');

		const players: player[] = nameManager.getAllyPlayersByAnyName(splitStr[1], player);

		if (players.length >= 2) return ErrorMsg(player, 'Multiple players found, be more specific!');
		if (players.length <= 0) return ErrorMsg(player, 'Player not found!');
		if (players[0] === player) return ErrorMsg(player, "You can't send gold to yourself!");

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

	// -y: accept a teammate's gold request
	chatManager.addCmd(['-y'], () => {
		if (GlobalGameData.matchState !== 'inProgress') return;
		if (!isTeamMode() || isSingleplayer()) return;

		const responder: player = GetTriggerPlayer();
		const request = getTeammateRequest(responder);

		if (!request) return ErrorMsg(responder, 'No pending gold request from your team!');

		const responderGold = GetPlayerState(responder, PLAYER_STATE_RESOURCE_GOLD);
		if (responderGold < 1) return ErrorMsg(responder, 'You have no gold to send!');

		const sendAmount = Math.min(request.amount, responderGold);

		SetPlayerState(responder, PLAYER_STATE_RESOURCE_GOLD, responderGold - sendAmount);
		SetPlayerState(
			request.requester,
			PLAYER_STATE_RESOURCE_GOLD,
			GetPlayerState(request.requester, PLAYER_STATE_RESOURCE_GOLD) + sendAmount
		);

		DisplayTextToPlayer(
			responder,
			0,
			0,
			`You sent ${HexColors.TANGERINE}${sendAmount}|r gold to ${nameManager.getDisplayName(request.requester)}|r!`
		);
		DisplayTextToPlayer(
			request.requester,
			0,
			0,
			`You received ${HexColors.TANGERINE}${sendAmount}|r gold from ${nameManager.getDisplayName(responder)}|r!`
		);

		clearRequest(request.requester);
	});

	// -n: dismiss a teammate's gold request
	chatManager.addCmd(['-n'], () => {
		if (GlobalGameData.matchState !== 'inProgress') return;
		if (!isTeamMode() || isSingleplayer()) return;

		const responder: player = GetTriggerPlayer();
		const request = getTeammateRequest(responder);

		if (!request) return ErrorMsg(responder, 'No pending gold request from your team!');

		DisplayTextToPlayer(responder, 0, 0, `You dismissed the gold request from ${nameManager.getDisplayName(request.requester)}|r.`);
		DisplayTextToPlayer(
			request.requester,
			0,
			0,
			`${nameManager.getDisplayName(responder)}|r dismissed your gold request.`
		);

		clearRequest(request.requester);
	});
}

function createGoldRequest(requester: player, amount: number, nameManager: NameManager): void {
	// Clear any existing request from this player
	clearRequest(requester);

	const team = TeamManager.getInstance().getTeamFromPlayer(requester);
	if (!team) return;

	const requestTimer: timer = CreateTimer();
	const request: GoldRequest = { requester, amount, timer: requestTimer };
	activeRequests.set(requester, request);

	// Notify all teammates
	const requesterName = nameManager.getDisplayName(requester);
	team.getMembers().forEach((member) => {
		const memberHandle = member.getPlayer();
		if (memberHandle === requester) {
			DisplayTextToPlayer(
				memberHandle,
				0,
				0,
				`You requested ${HexColors.TANGERINE}${amount}|r gold from your team. Expires in 10 seconds.`
			);
		} else {
			DisplayTextToPlayer(
				memberHandle,
				0,
				0,
				`${requesterName}|r requests ${HexColors.TANGERINE}${amount}|r gold. Type ${HexColors.TANGERINE}-y|r to send or ${HexColors.TANGERINE}-n|r to dismiss.`
			);
		}
	});

	// Auto-expire after 10 seconds
	TimerStart(requestTimer, 10, false, () => {
		if (activeRequests.has(requester)) {
			DisplayTextToPlayer(requester, 0, 0, `Your gold request has expired.`);
			clearRequest(requester);
		}
	});
}
