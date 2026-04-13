import { Resetable } from 'src/app/interfaces/resetable';
import { PlayerManager } from 'src/app/player/player-manager';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { SettingsContext } from 'src/app/settings/settings-context';
import { TeamManager } from 'src/app/teams/team-manager';
import { debugPrint } from 'src/app/utils/debug-print';
import { UNIT_TYPE } from 'src/app/utils/unit-types';
import { SHARED_SLOT_ALLOCATION_ENABLED, DC, DEBUG_PRINTS } from 'src/configs/game-settings';
import { GlobalGameData } from '../state/global-game-state';
import { PLAYER_COLORS } from '../../utils/player-colors';
import { NameManager } from '../../managers/names/name-manager';

interface SharedSlot extends player {}

export class SharedSlotManager implements Resetable {
	// This class will manage the shared slots and their interactions.
	private static instance: SharedSlotManager;
	private static MAX_PLAYERS_FOR_SHARED_SLOT_ALLOCATION = 11;

	public static getInstance(): SharedSlotManager {
		if (!SharedSlotManager.instance) {
			SharedSlotManager.instance = new SharedSlotManager();
		}
		return SharedSlotManager.instance;
	}

	/**
	 * Reset the singleton instance. For testing purposes only.
	 */
	public static resetInstance(): void {
		SharedSlotManager.instance = undefined as unknown as SharedSlotManager;
	}

	private availableSlots: SharedSlot[];

	// Keeps track of each player's shared slots (one player can have multiple)
	private playerToSlots: Map<player, SharedSlot[]>;

	// Keeps track of shared slot's player
	private slotToPlayer: Map<SharedSlot, player>;

	// Tracks the number of units owned by each WC3 player slot
	private slotUnitCounts: Map<player, number> = new Map<player, number>();

	// Slots of eliminated players that still have units alive
	private pendingFreeSlots: Set<player> = new Set<player>();

	private constructor() {
		// Initialize shared slot manager
		this.availableSlots = [];
		this.playerToSlots = new Map<player, SharedSlot[]>();
		this.slotToPlayer = new Map<SharedSlot, player>();
	}

	public incrementUnitCount(slot: player): void {
		const oldCount = this.slotUnitCounts.get(slot) || 0;
		const newCount = oldCount + 1;
		this.slotUnitCounts.set(slot, newCount);
		if (DEBUG_PRINTS.master) debugPrint(`[SharedSlots] Increment slot ${GetPlayerId(slot)}: ${oldCount} → ${newCount}`, DC.sharedSlots);
	}

	public decrementUnitCount(slot: player): void {
		const oldCount = this.slotUnitCounts.get(slot) || 0;
		const newCount = Math.max(0, oldCount - 1);
		this.slotUnitCounts.set(slot, newCount);
		if (DEBUG_PRINTS.master) debugPrint(`[SharedSlots] Decrement slot ${GetPlayerId(slot)}: ${oldCount} → ${newCount}`, DC.sharedSlots);
	}

	public getUnitCount(slot: player): number {
		return this.slotUnitCounts.get(slot) || 0;
	}

	public getSlotWithLowestUnitCount(player: player): player {
		const slots = this.playerToSlots.get(player);
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

		if (DEBUG_PRINTS.master)
			debugPrint(
				`[SharedSlots] Lowest slot for player ${GetPlayerId(player)}: slot ${GetPlayerId(bestSlot)} (count: ${bestCount})`,
				DC.sharedSlots
			);
		return bestSlot;
	}

	public debugPrintSlotCounts(): void {
		if (DEBUG_PRINTS.master) debugPrint(`[SharedSlots] === Slot Summary ===`, DC.sharedSlots);
		this.slotUnitCounts.forEach((count, slot) => {
			if (count > 0) {
				const realOwner = this.slotToPlayer.get(slot) || slot;
				if (DEBUG_PRINTS.master)
					debugPrint(`[SharedSlots] Slot ${GetPlayerId(slot)} (owner: ${GetPlayerId(realOwner)}): ${count} units`, DC.sharedSlots);
			}
		});
	}

	public getPendingFreeSlots(): Set<player> {
		return this.pendingFreeSlots;
	}

	/**
	 * General redistribution algorithm. Idempotent — safe to call from any event.
	 * Frees slots from eliminated players (if unit count is 0), then redistributes
	 * all available slots evenly among active players.
	 * Returns true if any changes were made.
	 */
	public evaluateAndRedistribute(): boolean {
		if (!SHARED_SLOT_ALLOCATION_ENABLED) {
			if (DEBUG_PRINTS.master) debugPrint('[Redistribute] Shared slot allocation disabled, skipping', DC.redistribute);
			return false;
		}

		if (DEBUG_PRINTS.master) debugPrint('[Redistribute] === Running evaluateAndRedistribute() ===', DC.redistribute);

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

		if (DEBUG_PRINTS.master)
			debugPrint(`[Redistribute] Active players: ${activePlayers.map((p) => GetPlayerId(p)).join(', ')}`, DC.redistribute);
		if (DEBUG_PRINTS.master)
			debugPrint(`[Redistribute] Eliminated players: ${eliminatedPlayers.map((p) => GetPlayerId(p)).join(', ')}`, DC.redistribute);

		if (activePlayers.length === 0) {
			if (DEBUG_PRINTS.master) debugPrint('[Redistribute] No active players, returning false', DC.redistribute);
			return false;
		}

		if (activePlayers.length > SharedSlotManager.MAX_PLAYERS_FOR_SHARED_SLOT_ALLOCATION) {
			if (DEBUG_PRINTS.master) debugPrint(`[Redistribute] Too many active players (${activePlayers.length}), skipping`, DC.redistribute);
			return false;
		}

		// 2. FREE: Identify reclaimable slots from eliminated players
		const availablePool: SharedSlot[] = [];

		for (const elimPlayer of eliminatedPlayers) {
			const sharedSlots = this.playerToSlots.get(elimPlayer);
			if (sharedSlots && sharedSlots.length > 0) {
				const remainingSlots: SharedSlot[] = [];
				for (const slot of sharedSlots) {
					if (this.getUnitCount(slot) === 0) {
						if (DEBUG_PRINTS.master)
							debugPrint(
								`[Redistribute] Freed slot ${GetPlayerId(slot)} from eliminated player ${GetPlayerId(elimPlayer)} (unitCount was 0)`,
								DC.redistribute
							);
						this.tearDownSlot(slot, elimPlayer);
						this.slotToPlayer.delete(slot);
						this.pendingFreeSlots.delete(slot);
						availablePool.push(slot);
					} else {
						const count = this.getUnitCount(slot);
						if (DEBUG_PRINTS.master)
							debugPrint(`[Redistribute] Slot ${GetPlayerId(slot)} marked pendingFree (unitCount: ${count})`, DC.redistribute);
						this.pendingFreeSlots.add(slot);
						remainingSlots.push(slot);
					}
				}
				if (remainingSlots.length > 0) {
					this.playerToSlots.set(elimPlayer, remainingSlots);
				} else {
					this.playerToSlots.delete(elimPlayer);
				}
			}

			// Only reclaim if they have no units AND no cities, otherwise we could end up in a situation 
			// where a player is eliminated but still has a city on the map and we accidentally free their slot 
			// to someone else, causing ownership issues with that city. 
			const activePlayerData = PlayerManager.getInstance().players.get(elimPlayer);
			const hasCities = activePlayerData && activePlayerData.trackedData.cities.cities.length > 0;

			// (Only if it's not already assigned as a shared slot to someone else)
			if (this.getUnitCount(elimPlayer) === 0 && !hasCities && !this.slotToPlayer.has(elimPlayer)) {
				// Check if this player slot is a valid shared slot candidate (not an active player)
				if (!activePlayers.includes(elimPlayer)) {
					// Check if it's not already in the pool
					if (!availablePool.includes(elimPlayer)) {
						if (DEBUG_PRINTS.master)
							debugPrint(`[Redistribute] Freed eliminated player handle ${GetPlayerId(elimPlayer)} (unitCount was 0)`, DC.redistribute);
						availablePool.push(elimPlayer);
						this.pendingFreeSlots.delete(elimPlayer);
					}
				}
			} else if (this.getUnitCount(elimPlayer) > 0 && !activePlayers.includes(elimPlayer)) {
				this.pendingFreeSlots.add(elimPlayer);
			}
		}

		// Also add unassigned empty player slots
		const availableSharedSlots = this.getAvailableSharedSlots();
		for (const slot of availableSharedSlots) {
			if (!availablePool.includes(slot) && !this.slotToPlayer.has(slot)) {
				// Check this slot isn't already assigned to an active player
				let alreadyAssigned = false;
				for (const [, slots] of this.playerToSlots) {
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

		if (DEBUG_PRINTS.master) debugPrint(`[Redistribute] Available pool: ${availablePool.length} slots`, DC.redistribute);

		// 3. CALCULATE: Determine optimal distribution
		// Count currently assigned slots per active player
		let totalAssignedSlots = 0;
		for (const p of activePlayers) {
			const slots = this.playerToSlots.get(p);
			totalAssignedSlots += slots ? slots.length : 0;
		}

		const totalSlots = totalAssignedSlots + availablePool.length;
		if (totalSlots === 0) {
			if (DEBUG_PRINTS.master) debugPrint('[Redistribute] No slots available at all, returning false', DC.redistribute);
			return false;
		}

		const slotsPerPlayer = Math.floor(totalSlots / activePlayers.length);

		if (DEBUG_PRINTS.master)
			debugPrint(
				`[Redistribute] Target: ${slotsPerPlayer} per player (${totalSlots % activePlayers.length} leftover unassigned)`,
				DC.redistribute
			);

		// Sort active players by ID for deterministic remainder distribution
		activePlayers.sort((a, b) => GetPlayerId(a) - GetPlayerId(b));

		const donors: { player: player; slotsToGive: SharedSlot[] }[] = [];
		const receivers: { player: player; slotsNeeded: number }[] = [];
		let anyChanges = false;

		for (let i = 0; i < activePlayers.length; i++) {
			const p = activePlayers[i];
			const currentSlots = this.playerToSlots.get(p) || [];
			const target = slotsPerPlayer;
			const delta = target - currentSlots.length;

			if (DEBUG_PRINTS.master)
				debugPrint(
					`[Redistribute] Player ${GetPlayerId(p)}: current=${currentSlots.length}, target=${target}, delta=${delta}`,
					DC.redistribute
				);

			if (delta < 0) {
				// Donor: give away slots with 0 units
				const slotsToGive: SharedSlot[] = [];
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
			if (DEBUG_PRINTS.master) debugPrint('[Redistribute] No changes needed, returning false', DC.redistribute);
			return false;
		}

		// 4. EXECUTE: Perform the redistribution
		// Collect donated slots
		for (const donor of donors) {
			for (const slot of donor.slotsToGive) {
				if (DEBUG_PRINTS.master)
					debugPrint(`[Redistribute] Donor ${GetPlayerId(donor.player)}: donating slot ${GetPlayerId(slot)}`, DC.redistribute);
				this.tearDownSlot(slot, donor.player);
				this.slotToPlayer.delete(slot);
				// Remove from donor's slot array
				const donorSlots = this.playerToSlots.get(donor.player);
				const idx = donorSlots.indexOf(slot);
				if (idx > -1) {
					donorSlots.splice(idx, 1);
				}
				availablePool.push(slot);
			}
		}

		// Sort receivers by fewest current slots first
		receivers.sort((a, b) => {
			const aSlots = this.playerToSlots.get(a.player)?.length || 0;
			const bSlots = this.playerToSlots.get(b.player)?.length || 0;
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
							if (DEBUG_PRINTS.master)
								debugPrint(
									`[Redistribute] Receiver ${GetPlayerId(receiver.player)}: assigned slot ${GetPlayerId(altSlot)}`,
									DC.redistribute
								);
						} else {
							availablePool.push(altSlot);
						}
					}
					continue;
				}
				this.assignSlotToPlayer(slot, receiver.player);
				if (DEBUG_PRINTS.master)
					debugPrint(`[Redistribute] Receiver ${GetPlayerId(receiver.player)}: assigned slot ${GetPlayerId(slot)}`, DC.redistribute);
			}
		}

		if (DEBUG_PRINTS.master) debugPrint(`[Redistribute] Complete. Leftover unassigned: ${availablePool.length}`, DC.redistribute);

		// 5. FINALIZE: Update scoreboard
		ScoreboardManager.getInstance().toggleVisibility(false);
		ScoreboardManager.getInstance().toggleVisibility(true);
		ScoreboardManager.getInstance().updateFull();

		return true;
	}

	private tearDownSlot(slot: SharedSlot, previousOwner: player): void {
		if (DEBUG_PRINTS.master)
			debugPrint(`[Redistribute] Tearing down slot ${GetPlayerId(slot)} (prev owner: ${GetPlayerId(previousOwner)})`, DC.redistribute);
		this.enableAdvancedControl(previousOwner, slot, false);
		this.enableAdvancedControl(slot, previousOwner, false);

		// Un-ally from all OTHER existing shared slots of the same player
		const siblingSlots = this.playerToSlots.get(previousOwner) || [];
		for (const siblingSlot of siblingSlots) {
			if (siblingSlot !== slot) {
				if (DEBUG_PRINTS.master)
					debugPrint(`[Redistribute] Un-allying sibling slots ${GetPlayerId(slot)} ↔ ${GetPlayerId(siblingSlot)}`, DC.redistribute);
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

							// Un-ally from all of the teammate's shared slots
							const memberSlots = this.playerToSlots.get(memberPlayer) || [];
							for (const memberSlot of memberSlots) {
								if (DEBUG_PRINTS.master)
									debugPrint(
										`[Redistribute] Un-allying cross-team slots ${GetPlayerId(slot)} ↔ ${GetPlayerId(memberSlot)}`,
										DC.redistribute
									);
								this.enableAdvancedControl(slot, memberSlot, false);
								this.enableAdvancedControl(memberSlot, slot, false);
							}
						}
					}
				});
			}
		}
	}

	private assignSlotToPlayer(slot: SharedSlot, newOwner: player): void {
		if (DEBUG_PRINTS.master)
			debugPrint(`[Redistribute] Assigning slot ${GetPlayerId(slot)} to player ${GetPlayerId(newOwner)}`, DC.redistribute);

		// Full alliance wipe before reassignment — ensures no stale alliances from previous owner
		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			if (!IsPlayerObserver(Player(i))) {
				this.enableAdvancedControl(slot, Player(i), false);
				this.enableAdvancedControl(Player(i), slot, false);
			}
		}
		if (DEBUG_PRINTS.master)
			debugPrint(`[Redistribute] Wiped all alliances for slot ${GetPlayerId(slot)} before reassignment`, DC.redistribute);

		if (!this.playerToSlots.has(newOwner)) {
			this.playerToSlots.set(newOwner, []);
		}
		this.playerToSlots.get(newOwner).push(slot);
		this.slotToPlayer.set(slot, newOwner);
		this.givePlayerFullControlOfSlot(newOwner, slot);

		const slots = this.playerToSlots.get(newOwner);
		if (DEBUG_PRINTS.master)
			debugPrint(
				`[SharedSlotManager] Player ${GetPlayerId(newOwner)} now has ${slots.length} shared slots: [${slots.map((s) => GetPlayerId(s)).join(', ')}]`,
				DC.sharedSlots
			);
	}

	public getSharedSlotByPlayer(player: player): player | undefined {
		const slots = this.playerToSlots.get(player);
		return slots && slots.length > 0 ? slots[0] : undefined;
	}

	public getSharedSlotsByPlayer(player: player): SharedSlot[] {
		return this.playerToSlots.get(player) || [];
	}

	// This method checks if there are less than MAX_PLAYERS_FOR_SHARED_SLOT_ALLOCATION players and then allocates one shared slot to each player
	private getAvailableSharedSlots(): SharedSlot[] {
		let sharedSlots: SharedSlot[] = [];
		const emptySlots = PlayerManager.getInstance().getEmptyPlayerSlots();
		if (DEBUG_PRINTS.master) debugPrint(`SharedSlotManager: Found ${emptySlots.length} empty player slots`, DC.sharedSlots);
		const leftPlayers = PlayerManager.getInstance().getPlayersThatLeftWithNoUnitsOrCities();
		if (DEBUG_PRINTS.master)
			debugPrint(`SharedSlotManager: Found ${leftPlayers.length} players that have left with no units or cities`, DC.sharedSlots);

		if (emptySlots && emptySlots.length > 0) {
			sharedSlots.push(...emptySlots.filter((p) => p !== undefined));
		}

		if (leftPlayers && leftPlayers.length > 0) {
			sharedSlots.push(...leftPlayers.filter((p) => p !== undefined));
		}

		return sharedSlots;
	}

	public givePlayerFullControlOfSlot(player: player, slot: SharedSlot): void {
		if (!player || !slot) {
			if (DEBUG_PRINTS.master) debugPrint('SharedSlotManager: Invalid player or slot in givePlayerFullControlOfSlot', DC.sharedSlots);
			return;
		}

		if (DEBUG_PRINTS.master)
			debugPrint(`SharedSlotManager: Giving player ${GetPlayerName(player)} full control of slot ${GetPlayerId(slot)}`, DC.sharedSlots);

		NameManager.getInstance().setColor(slot, NameManager.getInstance().getOriginalColor(player));
		NameManager.getInstance().copyDisplayNameToSlot(slot, player);

		this.enableAdvancedControl(player, slot, true);
		this.enableAdvancedControl(slot, player, true);

		// Ally this slot with all OTHER existing shared slots of the same player
		const existingSlots = this.playerToSlots.get(player) || [];
		for (const existingSlot of existingSlots) {
			if (existingSlot !== slot) {
				if (DEBUG_PRINTS.master)
					debugPrint(`SharedSlotManager: Allying sibling slots ${GetPlayerId(slot)} ↔ ${GetPlayerId(existingSlot)}`, DC.sharedSlots);
				this.enableAdvancedControl(slot, existingSlot, true);
				this.enableAdvancedControl(existingSlot, slot, true);
			}
		}

		// Only ally shared slots with team members in team-based game modes.
		// In FFA, teams from the lobby should not grant alliances.
		if (!SettingsContext.getInstance().isFFA()) {
			const team = TeamManager.getInstance().getTeamFromPlayer(player);
			if (team) {
				const members = team.getMembers();
				if (members && members.length > 0) {
					members.forEach((member) => {
						if (member) {
							const memberPlayer = member.getPlayer();
							if (memberPlayer) {
								this.enableAdvancedControl(memberPlayer, slot, true);
								this.enableAdvancedControl(slot, memberPlayer, true);

								// Also ally this slot with all of the teammate's shared slots
								const memberSlots = this.playerToSlots.get(memberPlayer) || [];
								for (const memberSlot of memberSlots) {
									if (DEBUG_PRINTS.master)
										debugPrint(
											`SharedSlotManager: Allying cross-team slots ${GetPlayerId(slot)} ↔ ${GetPlayerId(memberSlot)}`,
											DC.sharedSlots
										);
									this.enableAdvancedControl(slot, memberSlot, true);
									this.enableAdvancedControl(memberSlot, slot, true);
								}
							}
						}
					});
				}
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

	// This method returns the owner of the provided shared slot. If no shared slot is found, it returns the player itself.
	public getOwner(player: player): SharedSlot | player {
		return this.slotToPlayer.get(player) || player;
	}

	// This method returns the unit owner of the provided shared slot. If no shared slot is found then it returns the owner of the unit.
	public getOwnerOfUnit(unit: unit): SharedSlot | player {
		return this.getOwner(GetOwningPlayer(unit));
	}

	// Checks if the player can interact with the unit (owns it, owns it via shared slot, or is an eliminated observer)
	public canPlayerSeeUnitTooltip(unit: unit, player: player | SharedSlot): boolean {
		// Dead players are observers — allow them to see tooltips for all units
		const matchPlayer = PlayerManager.getInstance().players.get(player);
		if (matchPlayer && matchPlayer.status.isEliminated()) return true;

		const unitOwner = GetOwningPlayer(unit);
		// Check direct ownership (handles both real player and shared slot cases)
		if (unitOwner === player) return true;
		// Check if any of the player's shared slots own the unit
		const slots = this.playerToSlots.get(player);
		return slots ? slots.includes(unitOwner) : false;
	}

	// This method checks if the provided unit is owned by the provided shared slot
	public isSharedSlotOwnerOfUnit(unit: unit, slot: SharedSlot): boolean {
		// Check if the specific shared slot owns the unit
		return GetOwningPlayer(unit) === slot && this.slotToPlayer.has(slot);
	}

	// This method checks if the provided unit is owned by a shared slot
	public isAnySharedSlotOwnerOfUnit(unit: unit): boolean {
		return this.slotToPlayer.has(GetOwningPlayer(unit));
	}

	public getPlayerBySharedSlot(slot: SharedSlot): player | undefined {
		return this.slotToPlayer.get(slot) || undefined;
	}

	public getSharedSlotOrPlayer(player: player): SharedSlot | player {
		const slots = this.playerToSlots.get(player);
		return slots && slots.length > 0 ? slots[0] : player;
	}

	reset(): void {
		// Reset all player colors and names to default
		if (DEBUG_PRINTS.master) debugPrint('SharedSlotManager: Resetting all player colors and names to default', DC.sharedSlots);
		NameManager.getInstance().resetOriginalColors();
		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const p = Player(i);

			if (IsPlayerObserver(p)) {
				continue;
			}

			NameManager.getInstance().setColor(p, PLAYER_COLORS[GetPlayerId(p)]);
			NameManager.getInstance().setName(p, 'color');

			for (let targetIndex = 0; targetIndex < bj_MAX_PLAYERS; targetIndex++) {
				if (!IsPlayerObserver(Player(targetIndex))) {
					this.enableAdvancedControl(p, Player(targetIndex), false);
				}
			}
		}

		this.playerToSlots.clear();
		this.slotToPlayer.clear();
		this.availableSlots = [];
		this.slotUnitCounts.clear();
		this.pendingFreeSlots.clear();
		if (DEBUG_PRINTS.master) debugPrint('SharedSlotManager: Reset complete', DC.sharedSlots);
	}
}
