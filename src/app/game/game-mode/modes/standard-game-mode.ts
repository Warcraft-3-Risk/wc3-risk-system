import { ActivePlayer } from 'src/app/player/types/active-player';
import { City } from 'src/app/city/city';
import { BaseGameMode } from '../base/base-game-mode';

export class StandardGameMode extends BaseGameMode {
	onEndTurn(turn: number): void {
		super.onEndTurn(turn);
	}

	onCityCapture(city: City, preOwner: ActivePlayer, owner: ActivePlayer): void {
		super.onCityCapture(city, preOwner, owner);
	}
}
