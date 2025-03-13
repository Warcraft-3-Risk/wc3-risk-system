import { BaseState } from '../state/base-state';
import { CapitalsData } from '../mode/capitals-mode';
import { UNIT_ID } from 'src/configs/unit-id';
import { CityToCountry } from 'src/app/country/country-map';
import { LocalMessage } from 'src/app/utils/messages';
import { City } from 'src/app/city/city';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { PlayerManager } from 'src/app/player/player-manager';
import { Country } from 'src/app/country/country';
import { ShuffleArray } from 'src/app/utils/utils';
import { debugPrint } from 'src/app/utils/debug-print';

export class CapitalsDistributeCapitalsState extends BaseState<CapitalsData> {
	onEnterState() {
		debugPrint('Distributing Capitals');

		//Assign capitals for players that have chosen a capital city
		this.stateData.playerCapitalSelections.forEach((city, player) => {
			debugPrint(`Player ${player} has chosen a capital: ${city}`);
			if (city) {
				LocalMessage(player, `Your chosen capital is in ${CityToCountry.get(city).getName()}.`, '', 5);
				this.changeCityOwner(city, PlayerManager.getInstance().players.get(player));
				IssueImmediateOrderById(city.barrack.unit, UNIT_ID.CAPITAL);
				this.stateData.capitals.set(player, city);
				debugPrint(`Player ${player} has chosen a capital in ${CityToCountry.get(city).getName()}`);
			}
		});

		// Then randomly assign the rest of countries without existing capitals
		let countriesWithCapitals = new Set<Country>();
		this.stateData.playerCapitalSelections.forEach((city) => {
			const country = CityToCountry.get(city);
			if (country) {
				const countryName = country.getName();
				countriesWithCapitals.add(country);
				debugPrint(countryName);
			}
		});

		debugPrint(
			`Countries with capitals: ${Array.from(countriesWithCapitals)
				.map((x) => x.getName())
				.join(', ')}`
		);

		const validCityCountries = Array.from(CityToCountry.values())
			.filter((x) => !countriesWithCapitals.has(x))
			.filter((x) => x.getCities().filter((city) => !city.isPort()).length > 0)
			.filter((x) => x.getCities().length > 1);

		debugPrint(`All selectable cities count: ${validCityCountries.length}`);

		let uniqueCountries = new Set<Country>(validCityCountries);
		let randomSelectableCountries = Array.from(uniqueCountries);
		ShuffleArray(randomSelectableCountries);
		debugPrint(`Selectable countries without capitals: ${randomSelectableCountries.map((x) => x.getName()).join(', ')}`);

		debugPrint(`Players with capitals: ${Array.from(this.stateData.capitals.keys()).join(', ')}`);

		this.stateData.playerCapitalSelections.forEach((city, player) => {
			if (!city) {
				const country = randomSelectableCountries.pop();
				let countryBarracks = country.getCities().filter((city) => !city.isPort());
				ShuffleArray(countryBarracks);
				const capital = countryBarracks[0];

				LocalMessage(player, `You have been randomly assigned a capital in ${country.getName()}.`, '', 5);
				debugPrint(`Player ${player} has been randomly assigned a capital in ${country.getName()}`);
				this.changeCityOwner(capital, PlayerManager.getInstance().players.get(player));
				IssueImmediateOrderById(capital.barrack.unit, UNIT_ID.CAPITAL);
				PanCameraToTimedLocForPlayer(player, capital.barrack.location, 1);
				this.stateData.playerCapitalSelections.set(player, capital);
				this.stateData.capitals.set(player, capital);
			}
		});

		this.stateData.capitals.forEach((city, player) => {
			if (city) {
				CityToCountry.get(city).getSpawn().setMultiplier(2);
				PingMinimapLocForPlayer(player, city.barrack.location, 20);
				IssueImmediateOrderById(city.barrack.unit, UNIT_ID.CAPITAL);
			}
		});
		this.nextState(this.stateData);
	}

	changeCityOwner(city: City, player: ActivePlayer) {
		city.setOwner(player.getPlayer());
		SetUnitOwner(city.guard.unit, player.getPlayer(), true);
	}
}
