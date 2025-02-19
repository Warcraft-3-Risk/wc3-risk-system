import { City } from 'src/app/city/city';
import { ActivePlayer } from 'src/app/player/types/active-player';

export interface GameMode {
	onPlayerAlive: (player: ActivePlayer) => void;
	onPlayerDead: (player: ActivePlayer) => void;
	onPlayerNomad: (player: ActivePlayer) => void;
	onPlayerLeft: (player: ActivePlayer) => void;
	onPlayerSTFU: (player: ActivePlayer) => void;
	onPlayerForfeit: (player: ActivePlayer) => void;

	onCityCapture: (city: City, preOwner: ActivePlayer, owner: ActivePlayer) => void;
	onUnitKilled: (killingUnit: unit, dyingUnit: unit) => void;
	onRematch: () => Promise<void>;

	onCitySelected: (city: City, player: player) => void;
	onCityDeselected: (city: City, player: player) => void;

	onPreMatch: () => void;
	onInProgress: () => void;
	onPostMatch: () => void;

	isMatchOver: () => boolean;
	onStartMatch: () => Promise<void>;
	onEndMatch: () => void;
	onStartTurn: (turn: number) => void;
	onEndTurn: (turn: number) => void;
	onTick: (tick: number) => void;
	onDistributeBases: () => void;
}
