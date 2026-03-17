import { ActivePlayer } from '../player/types/active-player';

export interface PlayerStats {
	player: player;
	activePlayer: ActivePlayer;
	cityCount: number;
	strength: number; // cityCount / totalCities
}

export interface GlobalStats {
	largestPlayer: player | null;
	largestCityCount: number;
	totalActivePlayers: number;
	totalCities: number;
	playerStats: Map<player, PlayerStats>;
}
