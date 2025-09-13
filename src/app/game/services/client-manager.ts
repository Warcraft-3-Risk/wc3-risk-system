// PlayerClientManager is responsible for managing the players' clients in the game. The reason for this is to reduce the unit lag.

import { NameManager } from 'src/app/managers/names/name-manager';
import { PlayerManager } from 'src/app/player/player-manager';
import { debugPrint } from 'src/app/utils/debug-print';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';

// Players may experience unit lag when too many orders are issued simultaneously.
// Warcraft III appears to enforce a hard cap on the number of order issues a single player can queue.
// Once this cap is reached, new orders cannot be processed until earlier ones are resolved, causing units to appear unresponsive.
// Importantly, this lag is isolated to individual players and does not impact others.
// As such, we are here solving the issue by giving each player their own client "non active player slot", which we will call a client slot.

interface clientSlot extends player {}

export class ClientManager {
	// This class will manage the player clients and their interactions.
	private static instance: ClientManager;

	public static getInstance(): ClientManager {
		if (!ClientManager.instance) {
			ClientManager.instance = new ClientManager();
		}
		return ClientManager.instance;
	}

	// Keeps track of each player's client
	private clientSlots: Map<player, clientSlot>;

	// Keeps track of client's player
	private clientOwner: Map<clientSlot, player>;

	private constructor() {
		// Initialize player client manager
		this.clientSlots = new Map<player, clientSlot>();
		this.clientOwner = new Map<clientSlot, player>();
	}

	public getClientSlot(player: player): player | undefined {
		return this.clientSlots.get(player) as player;
	}

	// This method checks if there are less than 11 players and then allocates one client to each player
	public getAvailableClientSlots(): clientSlot[] {
		const slots = PlayerManager.getInstance()
			.getAllPlayerSlotsExceptObservers()
			.filter((x) => !PlayerManager.getInstance().isActive(x));

		return slots;
	}

	public allocateClientSlot(): void {
		// Get all active players
		debugPrint('Allocating client slots to players');
		const activePlayers = Array.from(PlayerManager.getInstance().players.entries())
			.map(([, activePlayer]) => activePlayer)
			.filter((x) => x.status.isActive());

		// Only allocate a client slot if there are less than 11 players
		if (activePlayers.length > 11) {
			debugPrint('Too many active players to allocate client slots');
			return;
		}

		const clientSlots = this.getAvailableClientSlots();

		debugPrint(`There are ${clientSlots.length} available client slots`);
		for (let playerIndex = 0; playerIndex < activePlayers.length; playerIndex++) {
			this.clientSlots.set(activePlayers[playerIndex].getPlayer(), clientSlots[playerIndex]);
			this.clientOwner.set(Player(playerIndex), Player(playerIndex)); // Simplifies getting actual owner
			this.clientOwner.set(clientSlots[playerIndex], activePlayers[playerIndex].getPlayer());
			this.givePlayerFullControlOfClient(activePlayers[playerIndex].getPlayer(), clientSlots[playerIndex]);
		}

		debugPrint('Finished allocating client slots to players');
	}

	public givePlayerFullControlOfClient(player: player, client: clientSlot): void {
		SetPlayerColor(client, GetPlayerColor(player));

		SetPlayerAlliance(player, client, ALLIANCE_PASSIVE, true);
		SetPlayerAlliance(player, client, ALLIANCE_HELP_REQUEST, true);
		SetPlayerAlliance(player, client, ALLIANCE_HELP_RESPONSE, true);
		SetPlayerAlliance(player, client, ALLIANCE_SHARED_XP, true);
		SetPlayerAlliance(player, client, ALLIANCE_SHARED_SPELLS, true);
		SetPlayerAlliance(player, client, ALLIANCE_SHARED_VISION, true);
		SetPlayerAlliance(player, client, ALLIANCE_SHARED_CONTROL, true);
		SetPlayerAlliance(player, client, ALLIANCE_SHARED_ADVANCED_CONTROL, true);
		debugPrint(
			`Gave player ${NameManager.getInstance().getDisplayName(player)} full control of client ${NameManager.getInstance().getDisplayName(client)}`
		);

		SetPlayerAlliance(client, player, ALLIANCE_PASSIVE, true);
		SetPlayerAlliance(client, player, ALLIANCE_HELP_REQUEST, true);
		SetPlayerAlliance(client, player, ALLIANCE_HELP_RESPONSE, true);
		SetPlayerAlliance(client, player, ALLIANCE_SHARED_XP, true);
		SetPlayerAlliance(client, player, ALLIANCE_SHARED_SPELLS, true);
		SetPlayerAlliance(client, player, ALLIANCE_SHARED_VISION, true);
		SetPlayerAlliance(client, player, ALLIANCE_SHARED_CONTROL, true);
		SetPlayerAlliance(client, player, ALLIANCE_SHARED_ADVANCED_CONTROL, true);
		debugPrint(
			`Gave client ${NameManager.getInstance().getDisplayName(client)} full control of player ${NameManager.getInstance().getDisplayName(player)}`
		);
	}

	// This method returns the owner of the provided client. If the owner is provided it returns the owner.
	public getActualClientOwner(player: player): player | undefined {
		if (this.clientOwner.get(player)) {
			return this.clientOwner.get(player);
		}
		return player;
	}

	// This method returns the unit owner of the provided client. If the owner is provided it returns the owner.
	public getActualClientOwnerOfUnit(unit: unit): player | undefined {
		if (this.clientOwner.get(GetOwningPlayer(unit))) {
			return this.clientOwner.get(GetOwningPlayer(unit));
		}
		return GetOwningPlayer(unit);
	}

	public getClientOfPlayer(player: player): player | undefined {
		return this.clientSlots.get(player) || undefined;
	}

	// public static breakPlayerFullControlOfClient(player: player, client: clientSlot) {
	// 	SetPlayerAlliance(player, client, ALLIANCE_PASSIVE, false);
	// 	SetPlayerAlliance(player, client, ALLIANCE_HELP_REQUEST, false);
	// 	SetPlayerAlliance(player, client, ALLIANCE_HELP_RESPONSE, false);
	// 	SetPlayerAlliance(player, client, ALLIANCE_SHARED_XP, false);
	// 	SetPlayerAlliance(player, client, ALLIANCE_SHARED_SPELLS, false);
	// 	SetPlayerAlliance(player, client, ALLIANCE_SHARED_VISION, false);
	// 	SetPlayerAlliance(player, client, ALLIANCE_SHARED_CONTROL, false);
	// 	SetPlayerAlliance(player, client, ALLIANCE_SHARED_ADVANCED_CONTROL, false);

	// 	SetPlayerAlliance(client, player, ALLIANCE_PASSIVE, false);
	// 	SetPlayerAlliance(client, player, ALLIANCE_HELP_REQUEST, false);
	// 	SetPlayerAlliance(client, player, ALLIANCE_HELP_RESPONSE, false);
	// 	SetPlayerAlliance(client, player, ALLIANCE_SHARED_XP, false);
	// 	SetPlayerAlliance(client, player, ALLIANCE_SHARED_SPELLS, false);
	// 	SetPlayerAlliance(client, player, ALLIANCE_SHARED_VISION, false);
	// 	SetPlayerAlliance(client, player, ALLIANCE_SHARED_CONTROL, false);
	// 	SetPlayerAlliance(client, player, ALLIANCE_SHARED_ADVANCED_CONTROL, false);
	// }
}
