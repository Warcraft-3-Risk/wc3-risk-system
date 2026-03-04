import { Resetable } from 'src/app/interfaces/resetable';
import { PlayerManager } from 'src/app/player/player-manager';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { SettingsContext } from 'src/app/settings/settings-context';
import { TeamManager } from 'src/app/teams/team-manager';
import { debugPrint } from 'src/app/utils/debug-print';
import { UNIT_TYPE } from 'src/app/utils/unit-types';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { CLIENT_ALLOCATION_ENABLED } from 'src/configs/game-settings';
import { GlobalGameData } from '../state/global-game-state';
import { PLAYER_COLORS } from '../../utils/player-colors';
import { NameManager } from '../../managers/names/name-manager';

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

	// Keeps track of each player's client slots (one player can have multiple)
	private playerToClient: Map<player, client[]>;

	// Keeps track of client's player
	private clientToPlayer: Map<client, player>;

	// Tracks the number of units owned by each WC3 player slot
	private slotUnitCounts: Map<player, number> = new Map<player, number>();

	// Slots of eliminated players that still have units alive
	private pendingFreeSlots: Set<player> = new Set<player>();

	// Maps neutralized units to their original real player (for color resolution after transfer to NEUTRAL_HOSTILE)
	private originalOwnerMap: Map<unit, player> = new Map<unit, player>();

	private constructor() {
		// Initialize player client manager
		this.availableClients = [];
		this.playerToClient = new Map<player, client[]>();
		this.clientToPlayer = new Map<client, player>();
	}

	public incrementUnitCount(slot: player): void {
		const oldCount = this.slotUnitCounts.get(slot) || 0;
		const newCount = oldCount + 1;
		this.slotUnitCounts.set(slot, newCount);
		debugPrint(`[SlotCount] Increment slot ${GetPlayerId(slot)}: ${oldCount} → ${newCount}`);
	}

	public decrementUnitCount(slot: player): void {
		const oldCount = this.slotUnitCounts.get(slot) || 0;
		const newCount = Math.max(0, oldCount - 1);
		this.slotUnitCounts.set(slot, newCount);
		debugPrint(`[SlotCount] Decrement slot ${GetPlayerId(slot)}: ${oldCount} → ${newCount}`);
	}

	public getUnitCount(slot: player): number {
		return this.slotUnitCounts.get(slot) || 0;
	}

	public getSlotWithLowestUnitCount(player: player): player {
		const slots = this.playerToClient.get(player);
		if (!slots || slots.length === 0) {
			return player;
		}

		// Include the player's own handle as a candidate
		let bestSlot = player;
		let bestCount = this.getUnitCount(player);

		for (const slot of slots) {
			const count = this.getUnitCount(slot);
			if (count < bestCount) {
				bestCount = count;
				bestSlot = slot;
			}
		}

		debugPrint(`[SlotCount] Lowest slot for player ${GetPlayerId(player)}: slot ${GetPlayerId(bestSlot)} (count: ${bestCount})`);
		return bestSlot;
	}

	public debugPrintSlotCounts(): void {
		debugPrint(`[SlotCount] === Slot Summary ===`);
		this.slotUnitCounts.forEach((count, slot) => {
			if (count > 0) {
				const realOwner = this.clientToPlayer.get(slot) || slot;
				debugPrint(`[SlotCount] Slot ${GetPlayerId(slot)} (owner: ${GetPlayerId(realOwner)}): ${count} units`);
			}
		});
	}

	public getPendingFreeSlots(): Set<player> {
		return this.pendingFreeSlots;
	}

	/**
	 * In FFA mode, immediately transfers all units/buildings of an eliminated player
	 * (and their client slots) to NEUTRAL_HOSTILE so the slots can be reclaimed.
	 * Units retain their original player color on-screen and minimap.
	 */
	public neutralizePlayerUnits(realPlayer: player): void {
		if (!SettingsContext.getInstance().isFFA()) {
			debugPrint(`[Neutralize] Skipping — not FFA mode`);
			return;
		}

		debugPrint(`[Neutralize] Neutralizing all units for player ${GetPlayerId(realPlayer)}`);

		const clientSlots = this.getClientSlotsByPlayer(realPlayer);
		const slots = [realPlayer, ...clientSlots];
		debugPrint(`[Neutralize] Processing ${slots.length} slots: [${slots.map((s) => GetPlayerId(s)).join(', ')}]`);

		const playerColor = GetPlayerColor(realPlayer);

		// Handle cities FIRST (before enumerating general units) to avoid mid-iteration ownership changes
		const matchPlayer = PlayerManager.getInstance().players.get(realPlayer);
		if (matchPlayer) {
			const citiesToNeutralize = [...matchPlayer.trackedData.cities.cities];
			for (const city of citiesToNeutralize) {
				// Store original owner for the guard unit (for minimap color resolution)
				this.setOriginalOwner(city.guard.unit, realPlayer);
				// Decrement guard unit count on its current slot
				this.decrementUnitCount(GetOwningPlayer(city.guard.unit));
				// Decrement barracks unit count
				this.decrementUnitCount(GetOwningPlayer(city.barrack.unit));
				// Decrement cop unit count
				this.decrementUnitCount(GetOwningPlayer(city.cop));
				// city.setOwner transfers cop, barracks, and triggers OwnershipChangeEvent
				city.setOwner(NEUTRAL_HOSTILE);
				// Retain original player color on all city components
				SetUnitOwner(city.guard.unit, NEUTRAL_HOSTILE, false);
				city.setColor(playerColor);
				debugPrint(`[Neutralize] Reset city (cop owner changed via city.setOwner)`);
			}
		}

		// Now enumerate and transfer all remaining units on each slot
		for (const slot of slots) {
			const unitsToTransfer: unit[] = [];
			const g = CreateGroup();
			GroupEnumUnitsOfPlayer(g, slot, null);
			ForGroup(g, () => {
				const u = GetEnumUnit();
				// Skip city cops — already handled above via city.setOwner()
				if (!IsUnitType(u, UNIT_TYPE.CITY)) {
					unitsToTransfer.push(u);
				}
			});
			DestroyGroup(g);

			for (const u of unitsToTransfer) {
				this.setOriginalOwner(u, realPlayer);
				SetUnitOwner(u, NEUTRAL_HOSTILE, false);
				SetUnitColor(u, playerColor);
				this.decrementUnitCount(slot);
				debugPrint(`[Neutralize] Transferred unit ${GetUnitName(u)} from slot ${GetPlayerId(slot)} to NEUTRAL_HOSTILE`);
			}
		}

		// Clear client slot mappings — slots are now free
		for (const clientSlot of clientSlots) {
			this.clientToPlayer.delete(clientSlot);
			this.pendingFreeSlots.delete(clientSlot);
		}
		this.playerToClient.delete(realPlayer);
		this.pendingFreeSlots.delete(realPlayer);
		debugPrint(`[Neutralize] Cleared ${clientSlots.length} client slot mappings for player ${GetPlayerId(realPlayer)}`);

		debugPrint(`[Neutralize] Complete. All slots should now have 0 units.`);
	}

	/**
	 * General redistribution algorithm. Idempotent — safe to call from any event.
	 * Frees slots from eliminated players (if unit count is 0), then redistributes
	 * all available slots evenly among active players.
	 * Returns true if any changes were made.
	 */
	public evaluateAndRedistribute(): boolean {
		if (!CLIENT_ALLOCATION_ENABLED) {
			debugPrint('[Redistribute] Client allocation disabled, skipping');
			return false;
		}

		debugPrint('[Redistribute] === Running evaluateAndRedistribute() ===');

		// 1. COLLECT: Build the current picture
		const activePlayers: player[] = [];
		const eliminatedPlayers: player[] = [];

		for (const matchPlayer of GlobalGameData.matchPlayers) {
			const p = matchPlayer.getPlayer();
			if (matchPlayer.status.isActive()) {
				activePlayers.push(p);
			} else if (matchPlayer.status.isEliminated()) {
				eliminatedPlayers.push(p);
			}
		}

		debugPrint(`[Redistribute] Active players: ${activePlayers.map((p) => GetPlayerId(p)).join(', ')}`);
		debugPrint(`[Redistribute] Eliminated players: ${eliminatedPlayers.map((p) => GetPlayerId(p)).join(', ')}`);

		if (activePlayers.length === 0) {
			debugPrint('[Redistribute] No active players, returning false');
			return false;
		}

		if (activePlayers.length > ClientManager.MAX_PLAYERS_FOR_CLIENT_ALLOCATION) {
			debugPrint(`[Redistribute] Too many active players (${activePlayers.length}), skipping`);
			return false;
		}

		// 2. FREE: Identify reclaimable slots from eliminated players
		const availablePool: client[] = [];

		for (const elimPlayer of eliminatedPlayers) {
			const clientSlots = this.playerToClient.get(elimPlayer);
			if (clientSlots && clientSlots.length > 0) {
				const remainingSlots: client[] = [];
				for (const slot of clientSlots) {
					if (this.getUnitCount(slot) === 0) {
						debugPrint(
							`[Redistribute] Freed slot ${GetPlayerId(slot)} from eliminated player ${GetPlayerId(elimPlayer)} (unitCount was 0)`
						);
						this.tearDownSlot(slot, elimPlayer);
						this.clientToPlayer.delete(slot);
						this.pendingFreeSlots.delete(slot);
						availablePool.push(slot);
					} else {
						const count = this.getUnitCount(slot);
						debugPrint(`[Redistribute] Slot ${GetPlayerId(slot)} marked pendingFree (unitCount: ${count})`);
						this.pendingFreeSlots.add(slot);
						remainingSlots.push(slot);
					}
				}
				if (remainingSlots.length > 0) {
					this.playerToClient.set(elimPlayer, remainingSlots);
				} else {
					this.playerToClient.delete(elimPlayer);
				}
			}

			// Also check if the eliminated player's own handle has 0 units and is reclaimable
			// (Only if it's not already assigned as a client to someone else)
			if (this.getUnitCount(elimPlayer) === 0 && !this.clientToPlayer.has(elimPlayer)) {
				// Check if this player slot is a valid client candidate (not an active player)
				if (!activePlayers.includes(elimPlayer)) {
					// Check if it's not already in the pool
					if (!availablePool.includes(elimPlayer)) {
						debugPrint(`[Redistribute] Freed eliminated player handle ${GetPlayerId(elimPlayer)} (unitCount was 0)`);
						availablePool.push(elimPlayer);
						this.pendingFreeSlots.delete(elimPlayer);
					}
				}
			} else if (this.getUnitCount(elimPlayer) > 0 && !activePlayers.includes(elimPlayer)) {
				this.pendingFreeSlots.add(elimPlayer);
			}
		}

		// Also add unassigned empty player slots
		const availableClientSlots = this.getAvailableClientSlots();
		for (const slot of availableClientSlots) {
			if (!availablePool.includes(slot) && !this.clientToPlayer.has(slot)) {
				// Check this slot isn't already assigned to an active player
				let alreadyAssigned = false;
				for (const [, slots] of this.playerToClient) {
					if (slots.includes(slot)) {
						alreadyAssigned = true;
						break;
					}
				}
				if (!alreadyAssigned && !activePlayers.includes(slot)) {
					availablePool.push(slot);
				}
			}
		}

		debugPrint(`[Redistribute] Available pool: ${availablePool.length} slots`);

		// 3. CALCULATE: Determine optimal distribution
		// Count currently assigned slots per active player
		let totalAssignedSlots = 0;
		for (const p of activePlayers) {
			const slots = this.playerToClient.get(p);
			totalAssignedSlots += slots ? slots.length : 0;
		}

		const totalSlots = totalAssignedSlots + availablePool.length;
		if (totalSlots === 0) {
			debugPrint('[Redistribute] No slots available at all, returning false');
			return false;
		}

		const slotsPerPlayer = Math.floor(totalSlots / activePlayers.length);
		const remainder = totalSlots % activePlayers.length;

		debugPrint(`[Redistribute] Target: ${slotsPerPlayer} per player (+1 for first ${remainder})`);

		// Sort active players by ID for deterministic remainder distribution
		activePlayers.sort((a, b) => GetPlayerId(a) - GetPlayerId(b));

		const donors: { player: player; slotsToGive: client[] }[] = [];
		const receivers: { player: player; slotsNeeded: number }[] = [];
		let anyChanges = false;

		for (let i = 0; i < activePlayers.length; i++) {
			const p = activePlayers[i];
			const currentSlots = this.playerToClient.get(p) || [];
			const target = slotsPerPlayer + (i < remainder ? 1 : 0);
			const delta = target - currentSlots.length;

			debugPrint(`[Redistribute] Player ${GetPlayerId(p)}: current=${currentSlots.length}, target=${target}, delta=${delta}`);

			if (delta < 0) {
				// Donor: give away slots with 0 units
				const slotsToGive: client[] = [];
				for (let j = currentSlots.length - 1; j >= 0 && slotsToGive.length < Math.abs(delta); j--) {
					if (this.getUnitCount(currentSlots[j]) === 0) {
						slotsToGive.push(currentSlots[j]);
					}
				}
				if (slotsToGive.length > 0) {
					donors.push({ player: p, slotsToGive });
					anyChanges = true;
				}
			} else if (delta > 0) {
				receivers.push({ player: p, slotsNeeded: delta });
				anyChanges = true;
			}
		}

		if (!anyChanges && availablePool.length === 0) {
			debugPrint('[Redistribute] No changes needed, returning false');
			return false;
		}

		// 4. EXECUTE: Perform the redistribution
		// Collect donated slots
		for (const donor of donors) {
			for (const slot of donor.slotsToGive) {
				debugPrint(`[Redistribute] Donor ${GetPlayerId(donor.player)}: donating slot ${GetPlayerId(slot)}`);
				this.tearDownSlot(slot, donor.player);
				this.clientToPlayer.delete(slot);
				// Remove from donor's slot array
				const donorSlots = this.playerToClient.get(donor.player);
				const idx = donorSlots.indexOf(slot);
				if (idx > -1) {
					donorSlots.splice(idx, 1);
				}
				availablePool.push(slot);
			}
		}

		// Sort receivers by fewest current slots first
		receivers.sort((a, b) => {
			const aSlots = this.playerToClient.get(a.player)?.length || 0;
			const bSlots = this.playerToClient.get(b.player)?.length || 0;
			return aSlots - bSlots;
		});

		// Assign from available pool to receivers
		for (const receiver of receivers) {
			for (let i = 0; i < receiver.slotsNeeded && availablePool.length > 0; i++) {
				const slot = availablePool.shift();
				// Don't assign a slot to itself
				if (GetPlayerId(slot) === GetPlayerId(receiver.player)) {
					availablePool.push(slot); // Put it back
					// Try another
					if (availablePool.length > 0) {
						const altSlot = availablePool.shift();
						if (GetPlayerId(altSlot) !== GetPlayerId(receiver.player)) {
							this.assignSlotToPlayer(altSlot, receiver.player);
							debugPrint(`[Redistribute] Receiver ${GetPlayerId(receiver.player)}: assigned slot ${GetPlayerId(altSlot)}`);
						} else {
							availablePool.push(altSlot);
						}
					}
					continue;
				}
				this.assignSlotToPlayer(slot, receiver.player);
				debugPrint(`[Redistribute] Receiver ${GetPlayerId(receiver.player)}: assigned slot ${GetPlayerId(slot)}`);
			}
		}

		debugPrint(`[Redistribute] Complete. Leftover unassigned: ${availablePool.length}`);

		// 5. REBALANCE: Spread existing units across newly assigned slots
		for (const receiver of receivers) {
			this.redistributeExistingUnits(receiver.player);
		}

		// 6. FINALIZE: Update scoreboard
		ScoreboardManager.getInstance().toggleVisibility(false);
		ScoreboardManager.getInstance().toggleVisibility(true);
		ScoreboardManager.getInstance().updateFull();

		return true;
	}

	private tearDownSlot(slot: client, previousOwner: player): void {
		debugPrint(`[Redistribute] Tearing down slot ${GetPlayerId(slot)} (prev owner: ${GetPlayerId(previousOwner)})`);
		this.enableAdvancedControl(previousOwner, slot, false);
		this.enableAdvancedControl(slot, previousOwner, false);

		// Un-ally from all OTHER existing client slots of the same player
		const siblingSlots = this.playerToClient.get(previousOwner) || [];
		for (const siblingSlot of siblingSlots) {
			if (siblingSlot !== slot) {
				debugPrint(`[Redistribute] Un-allying sibling slots ${GetPlayerId(slot)} ↔ ${GetPlayerId(siblingSlot)}`);
				this.enableAdvancedControl(slot, siblingSlot, false);
				this.enableAdvancedControl(siblingSlot, slot, false);
			}
		}

		const team = TeamManager.getInstance().getTeamFromPlayer(previousOwner);
		if (team) {
			const members = team.getMembers();
			if (members && members.length > 0) {
				members.forEach((member) => {
					if (member) {
						const memberPlayer = member.getPlayer();
						if (memberPlayer) {
							this.enableAdvancedControl(memberPlayer, slot, false);
							this.enableAdvancedControl(slot, memberPlayer, false);

							// Un-ally from all of the teammate's client slots
							const memberSlots = this.playerToClient.get(memberPlayer) || [];
							for (const memberSlot of memberSlots) {
								debugPrint(`[Redistribute] Un-allying cross-team slots ${GetPlayerId(slot)} ↔ ${GetPlayerId(memberSlot)}`);
								this.enableAdvancedControl(slot, memberSlot, false);
								this.enableAdvancedControl(memberSlot, slot, false);
							}
						}
					}
				});
			}
		}
	}

	private assignSlotToPlayer(slot: client, newOwner: player): void {
		debugPrint(`[Redistribute] Assigning slot ${GetPlayerId(slot)} to player ${GetPlayerId(newOwner)}`);

		// Full alliance wipe before reassignment — ensures no stale alliances from previous owner
		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			if (!IsPlayerObserver(Player(i))) {
				this.enableAdvancedControl(slot, Player(i), false);
				this.enableAdvancedControl(Player(i), slot, false);
			}
		}
		debugPrint(`[Redistribute] Wiped all alliances for slot ${GetPlayerId(slot)} before reassignment`);

		if (!this.playerToClient.has(newOwner)) {
			this.playerToClient.set(newOwner, []);
		}
		this.playerToClient.get(newOwner).push(slot);
		this.clientToPlayer.set(slot, newOwner);
		this.givePlayerFullControlOfClient(newOwner, slot);

		const slots = this.playerToClient.get(newOwner);
		debugPrint(
			`[ClientManager] Player ${GetPlayerId(newOwner)} now has ${slots.length} client slots: [${slots.map((s) => GetPlayerId(s)).join(', ')}]`
		);
	}

	/**
	 * Immediately redistributes all existing movable units of a player evenly
	 * across their own slot and all client slots. Skips transports, guards,
	 * buildings, and minimap indicators.
	 */
	public redistributeExistingUnits(realPlayer: player): void {
		const clientSlots = this.getClientSlotsByPlayer(realPlayer);
		if (clientSlots.length === 0) return;

		const allSlots = [realPlayer, ...clientSlots];

		// Collect all movable units across every slot
		const movableUnits: unit[] = [];
		for (const slot of allSlots) {
			const g = CreateGroup();
			GroupEnumUnitsOfPlayer(g, slot, null);
			ForGroup(g, () => {
				const u = GetEnumUnit();
				if (
					!IsUnitType(u, UNIT_TYPE.TRANSPORT) &&
					!IsUnitType(u, UNIT_TYPE.GUARD) &&
					!IsUnitType(u, UNIT_TYPE.BUILDING) &&
					GetUnitCurrentOrder(u) === 0 // Unit is currently not moving (changing ownership would cancel their current action)
				) {
					movableUnits.push(u);
				}
			});
			GroupClear(g);
			DestroyGroup(g);
		}

		if (movableUnits.length === 0) return;

		const numSlots = allSlots.length;
		const unitsPerSlot = Math.floor(movableUnits.length / numSlots);
		const remainder = movableUnits.length % numSlots;

		debugPrint(
			`[Redistribute] Spreading ${movableUnits.length} units for player ${GetPlayerId(realPlayer)} across ${numSlots} slots (${unitsPerSlot} each, +1 for first ${remainder})`
		);

		// Lazy import to avoid circular dependency (UnitLagManager imports ClientManager)
		const { UnitLagManager } = require('./unit-lag-manager') as { UnitLagManager: typeof import('./unit-lag-manager').UnitLagManager };
		const lagManager = UnitLagManager.getInstance();

		// Walk through units and assign each to the correct target slot
		let unitIndex = 0;
		for (let slotIdx = 0; slotIdx < numSlots; slotIdx++) {
			const targetSlot = allSlots[slotIdx];
			const targetCount = unitsPerSlot + (slotIdx < remainder ? 1 : 0);

			for (let j = 0; j < targetCount && unitIndex < movableUnits.length; j++) {
				const u = movableUnits[unitIndex];
				const currentOwner = GetOwningPlayer(u);

				if (currentOwner !== targetSlot) {
					// Untrack minimap icon before ownership change
					lagManager.untrackUnit(u);

					SetUnitOwner(u, targetSlot, true);

					this.decrementUnitCount(currentOwner);
					this.incrementUnitCount(targetSlot);

					// Re-track: will register with MinimapIconManager if now on a client slot
					lagManager.trackUnit(u);
				}

				unitIndex++;
			}
		}

		debugPrint(`[Redistribute] Finished spreading units for player ${GetPlayerId(realPlayer)}`);
		this.debugPrintSlotCounts();
	}

	public setOriginalOwner(unit: unit, realPlayer: player): void {
		this.originalOwnerMap.set(unit, realPlayer);
		debugPrint(`[Neutralize] Stored original owner for unit: player ${GetPlayerId(realPlayer)}`);
	}

	public getOriginalOwner(unit: unit): player | undefined {
		return this.originalOwnerMap.get(unit);
	}

	public clearOriginalOwner(unit: unit): void {
		this.originalOwnerMap.delete(unit);
	}

	public getClientByPlayer(player: player): player | undefined {
		const slots = this.playerToClient.get(player);
		return slots && slots.length > 0 ? slots[0] : undefined;
	}

	public getClientSlotsByPlayer(player: player): client[] {
		return this.playerToClient.get(player) || [];
	}

	// This method checks if there are less than MAX_PLAYERS_FOR_CLIENT_ALLOCATION players and then allocates one client to each player
	private getAvailableClientSlots(): client[] {
		let clients: client[] = [];
		const emptySlots = PlayerManager.getInstance().getEmptyPlayerSlots();
		debugPrint(`ClientManager: Found ${emptySlots.length} empty player slots`);
		const leftPlayers = PlayerManager.getInstance().getPlayersThatLeftWithNoUnitsOrCities();
		debugPrint(`ClientManager: Found ${leftPlayers.length} players that have left with no units or cities`);

		if (emptySlots && emptySlots.length > 0) {
			clients.push(...emptySlots.filter((p) => p !== null && p !== undefined));
		}

		if (leftPlayers && leftPlayers.length > 0) {
			clients.push(...leftPlayers.filter((p) => p !== null && p !== undefined));
		}

		return clients;
	}

	public givePlayerFullControlOfClient(player: player, client: client): void {
		if (!player || !client) {
			debugPrint('ClientManager: Invalid player or client in givePlayerFullControlOfClient');
			return;
		}

		debugPrint(`ClientManager: Giving player ${GetPlayerName(player)} full control of client ${GetPlayerId(client)}`);

		SetPlayerColor(client, GetPlayerColor(player));

		this.enableAdvancedControl(player, client, true);
		this.enableAdvancedControl(client, player, true);

		// Ally this slot with all OTHER existing client slots of the same player
		const existingSlots = this.playerToClient.get(player) || [];
		for (const existingSlot of existingSlots) {
			if (existingSlot !== client) {
				debugPrint(`ClientManager: Allying sibling slots ${GetPlayerId(client)} ↔ ${GetPlayerId(existingSlot)}`);
				this.enableAdvancedControl(client, existingSlot, true);
				this.enableAdvancedControl(existingSlot, client, true);
			}
		}

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

							// Also ally this slot with all of the teammate's client slots
							const memberSlots = this.playerToClient.get(memberPlayer) || [];
							for (const memberSlot of memberSlots) {
								debugPrint(`ClientManager: Allying cross-team slots ${GetPlayerId(client)} ↔ ${GetPlayerId(memberSlot)}`);
								this.enableAdvancedControl(client, memberSlot, true);
								this.enableAdvancedControl(memberSlot, client, true);
							}
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
	// Consults originalOwnerMap first for neutralized units.
	public getOwnerOfUnit(unit: unit): client | player {
		const original = this.originalOwnerMap.get(unit);
		if (original) return original;
		return this.getOwner(GetOwningPlayer(unit));
	}

	// This method checks if the provided unit is owned by the player or their client
	public isPlayerOrClientOwnerOfUnit(unit: unit, player: player | client): boolean {
		const unitOwner = GetOwningPlayer(unit);
		// Check direct ownership (handles both real player and client slot cases)
		if (unitOwner === player) return true;
		// Check if any of the player's client slots own the unit
		const slots = this.playerToClient.get(player);
		const clientOwns = slots ? slots.includes(unitOwner) : false;
		// Check reverse: if the player is a client, check if the real player owns the unit
		return this.clientToPlayer.get(player) == unitOwner || clientOwns;
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
		const slots = this.playerToClient.get(player);
		return slots && slots.length > 0 ? slots[0] : player;
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
		this.slotUnitCounts.clear();
		this.pendingFreeSlots.clear();
		this.originalOwnerMap.clear();
		debugPrint('ClientManager: Reset complete');
	}
}
