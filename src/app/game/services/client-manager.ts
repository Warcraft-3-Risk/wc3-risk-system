import { Resetable } from 'src/app/interfaces/resetable';
import { PlayerManager } from 'src/app/player/player-manager';
import { TeamManager } from 'src/app/teams/team-manager';
import { debugPrint } from 'src/app/utils/debug-print';
import { PLAYER_SLOTS } from 'src/app/utils/utils';

interface client extends player {}

export class ClientManager implements Resetable {
	// This class will manage the player clients and their interactions.
	private static instance: ClientManager;

	public static getInstance(): ClientManager {
		if (!ClientManager.instance) {
			ClientManager.instance = new ClientManager();
		}
		return ClientManager.instance;
	}

	private availableClients: client[];

	// Keeps track of each player's client
	private playerToClient: Map<player, client>;

	// Keeps track of client's player
	private clientToPlayer: Map<client, player>;

	private constructor() {
		// Initialize player client manager
		this.availableClients = [];
		this.playerToClient = new Map<player, client>();
		this.clientToPlayer = new Map<client, player>();
	}

	public getClientByPlayer(player: player): player | undefined {
		return this.playerToClient.get(player) as player;
	}

	// This method checks if there are less than 11 players and then allocates one client to each player
	private getAvailableClientSlots(): client[] {
		let clients: client[] = [];
		clients.push(...PlayerManager.getInstance().getEmptyPlayerSlots());
		clients.push(...PlayerManager.getInstance().getEliminatedPlayers());
		return clients;
	}

	public allocateClientSlot(): void {
		const activePlayers = Array.from(PlayerManager.getInstance().players.entries())
			.map(([, activePlayer]) => activePlayer)
			.filter((x) => x.status.isActive());

		// Only allocate a client slot if there are less than 11 players
		if (activePlayers.length > 11) {
			debugPrint('Too many active players to allocate client slots');
			return;
		}

		if (this.clientToPlayer.size >= 11) {
			debugPrint('All client slots have already been allocated');
			return;
		}

		const clients = this.getAvailableClientSlots();
		this.availableClients = clients.filter((x) => !this.clientToPlayer.has(x));

		debugPrint(`There are ${clients.length} available client slots`);
		for (let playerIndex = 0; playerIndex < activePlayers.length; playerIndex++) {
			// Only do this if the player does not already have a client slot
			if (!this.playerToClient.has(activePlayers[playerIndex].getPlayer())) {
				let client = this.availableClients.pop();
				this.playerToClient.set(activePlayers[playerIndex].getPlayer(), client);
				this.clientToPlayer.set(client, activePlayers[playerIndex].getPlayer());
				this.givePlayerFullControlOfClient(activePlayers[playerIndex].getPlayer(), client);
			}
		}

		debugPrint('Finished allocating client slots to players');
	}

	public givePlayerFullControlOfClient(player: player, client: client): void {
		SetPlayerColor(client, GetPlayerColor(player));
		SetPlayerName(client, `${GetPlayerName(player)}'s Spawns|r`);
		this.enableAdvancedControl(player, client, true);
		this.enableAdvancedControl(client, player, true);

		TeamManager.getInstance()
			.getTeamFromPlayer(player)
			.getMembers()
			.forEach((member) => {
				this.enableAdvancedControl(member.getPlayer(), client, true);
				this.enableAdvancedControl(client, member.getPlayer(), true);
			});
	}

	private enableAdvancedControl(playerA: player, playerB: player, value: boolean): void {
		SetPlayerAlliance(playerA, playerB, ALLIANCE_PASSIVE, value);
		SetPlayerAlliance(playerA, playerB, ALLIANCE_HELP_REQUEST, value);
		SetPlayerAlliance(playerA, playerB, ALLIANCE_HELP_RESPONSE, value);
		SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_XP, value);
		SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_SPELLS, value);
		SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_VISION, value);
		SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_CONTROL, value);
		SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_ADVANCED_CONTROL, value);
	}

	// This method returns the owner of the provided client. If no client is found, it returns the player itself.
	public getOwner(player: player): client | player {
		return this.clientToPlayer.get(player) || player;
	}

	// This method returns the unit owner of the provided client. If no client is found then it returns the owner of the unit.
	public getOwnerOfUnit(unit: unit): client | player {
		return this.getOwner(GetOwningPlayer(unit));
	}

	public getPlayerByClient(player: client): player | undefined {
		return this.clientToPlayer.get(player) || undefined;
	}

	public getClientOrPlayer(player: player): client | player {
		return this.playerToClient.get(player) || player;
	}

	reset(): void {
		const activePlayers = Array.from(PlayerManager.getInstance().players.entries()).map(([, activePlayer]) => activePlayer);
		Array.from(this.playerToClient.values()).forEach((client) => {
			activePlayers.forEach((activePlayer) => {
				this.enableAdvancedControl(activePlayer.getPlayer(), client, false);
				this.enableAdvancedControl(client, activePlayer.getPlayer(), false);

				TeamManager.getInstance()
					.getTeamFromPlayer(activePlayer.getPlayer())
					.getMembers()
					.forEach((member) => {
						this.enableAdvancedControl(member.getPlayer(), client, false);
						this.enableAdvancedControl(client, member.getPlayer(), false);
					});
			});
		});

		this.playerToClient.clear();
		this.clientToPlayer.clear();
		this.availableClients = [];
	}
}
