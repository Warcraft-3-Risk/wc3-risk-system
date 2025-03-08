import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { CityToCountry } from 'src/app/country/country-map';
import { SettingsContext } from 'src/app/settings/settings-context';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { Wait } from 'src/app/utils/wait';
import { GlobalGameData } from '../../state/global-game-state';

export class SetPromodeTempVisionState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		this.runAsync();
	}

	async runAsync(): Promise<void> {
		SettingsContext.getInstance().applyStrategy('Fog');
		const players = GlobalGameData.matchPlayers;

		const visionMap = new Map<unit, player[]>();

		DisplayTextToForce(bj_FORCE_ALL_PLAYERS, `Revealing blocks`);

		for (const activePlayer of players) {
			const playerHandle: player = activePlayer.getPlayer();

			const allies: player[] = [];
			for (const otherPlayer of players) {
				const otherPlayerHandle: player = otherPlayer.getPlayer();
				if (IsPlayerAlly(playerHandle, otherPlayerHandle)) {
					allies.push(otherPlayerHandle);
				}
			}

			activePlayer.trackedData.cities.cities.forEach((playerCity) => {
				const country = CityToCountry.get(playerCity);

				country.getCities().forEach((countryCity) => {
					const unit: unit = countryCity.cop;

					if (GetOwningPlayer(unit) !== NEUTRAL_HOSTILE) {
						UnitShareVision(unit, playerHandle, true);

						const playersWithVision = visionMap.get(unit) || [];

						playersWithVision.push(playerHandle);

						allies.forEach((ally) => {
							UnitShareVision(unit, ally, true);
							playersWithVision.push(ally);
						});

						visionMap.set(unit, playersWithVision);
					}
				});
			});
		}

		await Wait.forSeconds(4);

		for (const [unit, players] of visionMap.entries()) {
			players.forEach((playerHandle) => {
				UnitShareVision(unit, playerHandle, false);
			});
		}

		ClearTextMessages();

		this.nextState(this.stateData);
	}
}
