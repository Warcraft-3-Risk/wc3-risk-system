import { City } from 'src/app/city/city';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { StandardDistributionService } from './standard-distribution-service';
import { GlobalGameData } from '../../state/global-game-state';
import { EqualizedPromodeData } from '../../game-mode/mode/equalized-promode-mode';
import { RegionToCity } from 'src/app/city/city-map';

/**
 * Distribution service for Equalized ProMode that ensures fair 1v1 matches.
 * - Round 1: Random city allocation for both players
 * - Round 2: Same cities as Round 1, but swapped between players
 * This ensures each player plays from each starting position.
 *
 * Uses guard coordinates as stable identifiers because City objects get recreated
 * between rounds, but guard coordinates are constant map properties.
 */
export class EqualizedPromodeDistributionService extends StandardDistributionService {
	// Save "x_y" coordinate string -> player mapping (coordinates persist across resets, City objects don't)
	private static savedAllocations: Map<string, player> | null = null;

	// Track which round we're on (survives state resets, unlike stateData)
	private static currentRoundNumber: number = 1;

	// Track who won Round 1 (survives state resets, unlike stateData)
	private static round1Winner: player | null = null;

	/**
	 * Implements the equalized distribution algorithm.
	 * On Round 1: Generate new random allocations and save them
	 * On Round 2: Use saved allocations but swap the players
	 */
	protected distribute() {
		const roundNumber = EqualizedPromodeDistributionService.currentRoundNumber;

		if (roundNumber === 1) {
			// Round 1: generate new allocations and save them
			this.distributeAndSave();
		} else {
			// Round 2: use saved allocations but swap players
			this.distributeFromSavedSwapped();
		}
	}

	/**
	 * Creates a unique identifier for a city based on its guard coordinates.
	 * @param city - The city to identify.
	 * @returns A string key in format "x_y".
	 */
	private getCityKey(city: City): string {
		const x = city.guard.defaultX;
		const y = city.guard.defaultY;
		return `${x}_${y}`;
	}

	/**
	 * Distributes cities randomly and saves the allocations for the next round.
	 * Saves coordinate->player mappings (coordinates persist across resets).
	 */
	private distributeAndSave(): void {
		// Clear any previous saved allocations
		EqualizedPromodeDistributionService.savedAllocations = new Map<string, player>();

		// Run standard distribution
		super.distribute();

		// Save the allocations using coordinate->player mapping
		RegionToCity.forEach((city) => {
			const cityKey = this.getCityKey(city);
			const cityOwner = city.getOwner();
			// Save coordinates->player (coordinates are stable, City objects get recreated)
			EqualizedPromodeDistributionService.savedAllocations.set(cityKey, cityOwner);
		});
	}

	/**
	 * Distributes cities using saved allocations but with players swapped.
	 * Looks up each city's original owner by coordinates and swaps to the other player.
	 */
	private distributeFromSavedSwapped(): void {
		if (!EqualizedPromodeDistributionService.savedAllocations) {
			super.distribute();
			return;
		}

		const players = this.getPlayers();
		if (players.length !== 2) {
			super.distribute();
			return;
		}

		const [player1, player2] = players;

		// Apply saved allocations but swap the players
		RegionToCity.forEach((city) => {
			const cityKey = this.getCityKey(city);
			const originalOwnerPlayer = EqualizedPromodeDistributionService.savedAllocations.get(cityKey);

			if (originalOwnerPlayer) {
				// Find which ActivePlayer corresponds to the original owner
				const originalOwnerActive = players.find(p => p.getPlayer() === originalOwnerPlayer);

				if (originalOwnerActive) {
					// Swap: if original owner was player1, new owner is player2 (and vice versa)
					const newOwner = originalOwnerActive === player1 ? player2 : player1;
					this.changeCityOwner(city, newOwner);
				}
			}
		});
	}

	/**
	 * Gets the list of players as an array.
	 * @returns Array of active players.
	 */
	private getPlayers(): ActivePlayer[] {
		const players: ActivePlayer[] = [];
		const playerList = (this as any).players; // Access protected players property

		// Convert DoublyLinkedList to array
		const length = playerList.length();
		for (let i = 0; i < length; i++) {
			const player = playerList.removeFirst();
			players.push(player);
			playerList.addLast(player); // Add back to maintain the list
		}

		return players;
	}

	/**
	 * Sets the current round number (called from GameOverState).
	 */
	public static setRoundNumber(roundNumber: number): void {
		EqualizedPromodeDistributionService.currentRoundNumber = roundNumber;
	}

	/**
	 * Gets the current round number.
	 */
	public static getRoundNumber(): number {
		return EqualizedPromodeDistributionService.currentRoundNumber;
	}

	/**
	 * Sets the Round 1 winner (called from GameOverState).
	 */
	public static setRound1Winner(winner: player | null): void {
		EqualizedPromodeDistributionService.round1Winner = winner;
	}

	/**
	 * Gets the Round 1 winner.
	 */
	public static getRound1Winner(): player | null {
		return EqualizedPromodeDistributionService.round1Winner;
	}

	/**
	 * Resets the saved allocations. Should be called when starting a new pair of rounds.
	 */
	public static resetAllocations(): void {
		EqualizedPromodeDistributionService.savedAllocations = null;
		EqualizedPromodeDistributionService.currentRoundNumber = 1;
		EqualizedPromodeDistributionService.round1Winner = null;
	}
}