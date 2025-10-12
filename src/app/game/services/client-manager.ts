import { Resetable } from 'src/app/interfaces/resetable';
import { NameManager } from 'src/app/managers/names/name-manager';
import { PlayerManager } from 'src/app/player/player-manager';
import { SettingsContext } from 'src/app/settings/settings-context';
import { TeamManager } from 'src/app/teams/team-manager';
import { PLAYER_COLORS } from 'src/app/utils/player-colors';
import { debugPrint } from 'src/app/utils/debug-print';

interface client extends player {}

export class ClientManager implements Resetable {
	// This class will manage the player clients and their interactions.
	private static instance: ClientManager;
	private static MAX_PLAYERS_FOR_CLIENT_ALLOCATION = 11;

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

	// Flag to ensure allocation only happens once
	private hasAllocated: boolean = false;

	private constructor() {
		// Initialize player client manager
		this.availableClients = [];
		this.playerToClient = new Map<player, client>();
		this.clientToPlayer = new Map<client, player>();
	}

	public getClientByPlayer(player: player): player | undefined {
		return this.playerToClient.get(player) as player;
	}

	// This method checks if there are less than MAX_PLAYERS_FOR_CLIENT_ALLOCATION players and then allocates one client to each player
	private getAvailableClientSlots(): client[] {
		let clients: client[] = [];
		const emptySlots = PlayerManager.getInstance().getEmptyPlayerSlots();
		const leftPlayers = PlayerManager.getInstance().getPlayersThatLeft();

		if (emptySlots && emptySlots.length > 0) {
			clients.push(...emptySlots.filter((p) => p !== null && p !== undefined));
		}

		if (leftPlayers && leftPlayers.length > 0) {
			clients.push(...leftPlayers.filter((p) => p !== null && p !== undefined));
		}

		return clients;
	}

	public allocateClientSlot(): void {
		// Check if allocation has already been done
		if (this.hasAllocated) {
			debugPrint('ClientManager: Client allocation already completed, skipping');
			return;
		}

		const activePlayers = Array.from(PlayerManager.getInstance().players.entries())
			.map(([, activePlayer]) => activePlayer)
			.filter((x) => x.status.isActive());

		// Only allocate a client slot if there are less than MAX_PLAYERS_FOR_CLIENT_ALLOCATION players
		if (activePlayers.length > ClientManager.MAX_PLAYERS_FOR_CLIENT_ALLOCATION) {
			debugPrint(`ClientManager: Too many active players (${activePlayers.length}), skipping allocation`);
			return;
		}

		if (this.clientToPlayer.size >= ClientManager.MAX_PLAYERS_FOR_CLIENT_ALLOCATION) {
			debugPrint('ClientManager: Maximum client allocations already reached');
			return;
		}

		const clients = this.getAvailableClientSlots();
		debugPrint(`ClientManager: Found ${clients.length} available client slots`);

		if (!clients || clients.length === 0) {
			debugPrint('ClientManager: No available client slots found');
			return;
		}

		this.availableClients = clients.filter((x) => x && !this.clientToPlayer.has(x));
		debugPrint(`ClientManager: ${this.availableClients.length} client slots available after filtering`);

		if (this.availableClients.length === 0) {
			debugPrint('ClientManager: All available client slots are already in use');
			return;
		}

		debugPrint(`ClientManager: Attempting to allocate clients for ${activePlayers.length} active players`);

		for (let playerIndex = 0; playerIndex < activePlayers.length; playerIndex++) {
			const activePlayer = activePlayers[playerIndex];
			if (!activePlayer) {
				debugPrint(`ClientManager: Active player at index ${playerIndex} is null/undefined`);
				continue;
			}

			const playerHandle = activePlayer.getPlayer();
			if (!playerHandle) {
				debugPrint(`ClientManager: Player handle for active player at index ${playerIndex} is null/undefined`);
				continue;
			}

			// Only do this if the player does not already have a client slot
			if (!this.playerToClient.has(playerHandle)) {
				// Check if we have available clients before popping
				if (this.availableClients.length === 0) {
					debugPrint(`ClientManager: No more available clients for player ${GetPlayerName(playerHandle)}`);
					break;
				}

				const client = this.availableClients.pop();
				if (!client) {
					debugPrint(`ClientManager: Failed to allocate client for player ${GetPlayerName(playerHandle)} - pop returned null/undefined`);
					continue;
				}

				debugPrint(`ClientManager: Allocating client slot ${GetPlayerId(client)} to player ${GetPlayerName(playerHandle)}`);
				this.playerToClient.set(playerHandle, client);
				this.clientToPlayer.set(client, playerHandle);
				this.givePlayerFullControlOfClient(playerHandle, client);
				debugPrint(`ClientManager: Successfully allocated client to player ${GetPlayerName(playerHandle)}`);
			} else {
				debugPrint(`ClientManager: Player ${GetPlayerName(playerHandle)} already has a client slot`);
			}
		}

		// Mark allocation as complete
		this.hasAllocated = true;
		debugPrint('ClientManager: Client allocation complete');
	}

	public givePlayerFullControlOfClient(player: player, client: client): void {
		if (!player || !client) {
			debugPrint('ClientManager: Invalid player or client in givePlayerFullControlOfClient');
			return;
		}

		debugPrint(`ClientManager: Giving player ${GetPlayerName(player)} full control of client ${GetPlayerId(client)}`);

		if (SettingsContext.getInstance().isPromode()) {
			NameManager.getInstance().setName(client, 'acct');
		} else {
			NameManager.getInstance().setName(client, 'btag');
		}

		SetPlayerColor(client, GetPlayerColor(player));
		SetPlayerName(client, GetPlayerName(player));
		this.enableAdvancedControl(player, client, true);
		this.enableAdvancedControl(client, player, true);

		const team = TeamManager.getInstance().getTeamFromPlayer(player);
		if (team) {
			const members = team.getMembers();
			if (members && members.length > 0) {
				members.forEach((member) => {
					if (member) {
						const memberPlayer = member.getPlayer();
						if (memberPlayer) {
							this.enableAdvancedControl(memberPlayer, client, true);
							this.enableAdvancedControl(client, memberPlayer, true);
						}
					}
				});
			}
		}
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

	// This method checks if the provided unit is owned by the player or their client
	public isPlayerOrClientOwnerOfUnit(unit: unit, player: player | client): boolean {
		return this.clientToPlayer.get(player) == GetOwningPlayer(unit) || this.playerToClient.get(player) == GetOwningPlayer(unit);
	}

	// This method checks if the provided unit is owned by the provided client
	public isClientOwnerOfUnit(unit: unit, client: client): boolean {
		// Check if the specific client owns the unit
		return GetOwningPlayer(unit) === client && this.clientToPlayer.has(client);
	}

	// This method checks if the provided unit is owned by a client
	public isAnyClientOwnerOfUnit(unit: unit): boolean {
		return this.clientToPlayer.has(GetOwningPlayer(unit));
	}

	public getPlayerByClient(player: client): player | undefined {
		return this.clientToPlayer.get(player) || undefined;
	}

	public getClientOrPlayer(player: player): client | player {
		return this.playerToClient.get(player) || player;
	}

	reset(): void {
		for (let ci = 0; ci < bj_MAX_PLAYERS; ci++) {
			PlayerManager.getInstance().players.forEach((_, p) => {
				NameManager.getInstance().setColor(p, PLAYER_COLORS[GetPlayerId(p)]);
			});
			PlayerManager.getInstance()
				.getEmptyPlayerSlots()
				.forEach((p) => {
					SetPlayerColor(p, PLAYER_COLORS[GetPlayerId(p)]);
					NameManager.getInstance().setColor(p, PLAYER_COLORS[GetPlayerId(p)]);
					NameManager.getInstance().setName(p, 'btag');
				});

			for (let pi = 0; pi < bj_MAX_PLAYERS; pi++) {
				this.enableAdvancedControl(Player(ci), Player(pi), false);
				this.enableAdvancedControl(Player(pi), Player(ci), false);
			}
		}

		this.playerToClient.clear();
		this.clientToPlayer.clear();
		this.availableClients = [];
		this.hasAllocated = false;
		debugPrint('ClientManager: Reset complete, allocation flag cleared');
	}
}
