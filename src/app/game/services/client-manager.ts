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

	// Allocates client slots to players if there are less than MAX_PLAYERS_FOR_CLIENT_ALLOCATION players
	// This method can only be called once per game
	// Returns true if allocation was successfully applied, false otherwise
	public allocateClientSlot(): boolean {
		debugPrint('ClientManager: Starting client allocation process');

		// Check if allocation has already been done
		if (this.hasAllocated) {
			debugPrint('ClientManager: Client allocation already completed, skipping');
			return false;
		}

		debugPrint('ClientManager: Client allocation not yet done, proceeding');

		debugPrint('ClientManager: Checking number of active players');
		const players = Array.from(PlayerManager.getInstance().players.entries())
			.map(([, activePlayer]) => activePlayer)
			.filter((x) => x.status.isActive())
			.map((x) => x.getPlayer());

		debugPrint(`ClientManager: Found ${players.length} active players slots: ${players.map((c) => GetPlayerId(c)).join(', ')}`);

		// Only allocate a client slot if there are less than MAX_PLAYERS_FOR_CLIENT_ALLOCATION players
		if (players.length > ClientManager.MAX_PLAYERS_FOR_CLIENT_ALLOCATION) {
			debugPrint(`ClientManager: Too many active players (${players.length}), skipping allocation`);
			return false;
		} else {
			debugPrint(`ClientManager: Active players within limit (${players.length}), proceeding with allocation`);
		}

		debugPrint('ClientManager: Checking current client allocations');
		if (this.clientToPlayer.size >= ClientManager.MAX_PLAYERS_FOR_CLIENT_ALLOCATION) {
			debugPrint('ClientManager: Maximum client allocations already reached');
			return false;
		} else {
			debugPrint(`ClientManager: Current client allocations: ${this.clientToPlayer.size}`);
		}

		debugPrint('ClientManager: Retrieving available client slots');
		let availableClientSlots = this.getAvailableClientSlots().filter(
			(client) => !players.find((player) => GetPlayerId(player) === GetPlayerId(client))
		);
		debugPrint(`ClientManager: Found ${availableClientSlots.length} available client slots`);

		debugPrint(`ClientManager: Available client slots: ${availableClientSlots.map((c) => GetPlayerId(c)).join(', ')}`);

		if (availableClientSlots.length < players.length) {
			debugPrint('ClientManager: Insufficient client slots available for allocation');
			return false;
		}

		debugPrint(`ClientManager: Attempting to allocate clients for ${players.length} active players`);
		players.forEach((activePlayer) => {
			const playerHandle = activePlayer;
			const client = availableClientSlots.pop();

			if (!client) {
				debugPrint(`ClientManager: No available client slots for player ${GetPlayerName(playerHandle)}`);
				return;
			}

			debugPrint(`ClientManager: Allocating client slot ${GetPlayerId(client)} to player ${GetPlayerName(playerHandle)}`);
			this.playerToClient.set(playerHandle, client);
			this.clientToPlayer.set(client, playerHandle);
			this.givePlayerFullControlOfClient(playerHandle, client);
			debugPrint(`ClientManager: Successfully allocated client to player ${GetPlayerName(playerHandle)}`);
		});

		// Mark allocation as complete
		this.hasAllocated = true;
		debugPrint('ClientManager: Client allocation complete');
		return true;
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
		// Reset all player colors and names to default
		debugPrint('ClientManager: Resetting all player colors and names to default');
		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const p = Player(i);

			if (IsPlayerObserver(p)) {
				continue;
			}

			SetPlayerColor(p, PLAYER_COLORS[GetPlayerId(p)]);
			NameManager.getInstance().setColor(p, PLAYER_COLORS[GetPlayerId(p)]);
			NameManager.getInstance().setName(p, 'color');

			for (let targetIndex = 0; targetIndex < bj_MAX_PLAYERS; targetIndex++) {
				if (!IsPlayerObserver(Player(targetIndex))) {
					this.enableAdvancedControl(p, Player(targetIndex), false);
				}
			}
		}

		this.playerToClient.clear();
		this.clientToPlayer.clear();
		this.availableClients = [];
		this.hasAllocated = false;
		debugPrint('ClientManager: Reset complete, allocation flag cleared');
	}
}
