import { City } from '../city/city';
import { UnitToCity } from '../city/city-map';
import { Country } from '../country/country';
import { CityToCountry } from '../country/country-map';
import { VictoryManager } from '../managers/victory-manager';
import { PlayerManager } from '../player/player-manager';
import { PLAYER_STATUS } from '../player/status/status-enum';
import { ActivePlayer } from '../player/types/active-player';
import { UNIT_TYPE } from '../utils/unit-types';
import { TrackedData } from '../player/data/tracked-data';
import { CountryToRegion } from '../region/region-map';
import { Region } from '../region/region';
import { ScoreboardManager } from '../scoreboard/scoreboard-manager';
import { SettingsContext } from '../settings/settings-context';
import { TeamManager } from '../teams/team-manager';
import { GlobalGameData } from '../game/state/global-game-state';
import { EventEmitter } from '../utils/events/event-emitter';
import { EVENT_ON_CITY_CAPTURE } from '../utils/events/event-constants';

export function OwnershipChangeEvent() {
	const t: trigger = CreateTrigger();

	for (let i = 0; i < bj_MAX_PLAYER_SLOTS; i++) {
		TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_CHANGE_OWNER, null);
	}

	TriggerAddCondition(
		t,
		Condition(() => {
			if (!IsUnitType(GetChangingUnit(), UNIT_TYPE.CITY)) return false;
			if (GlobalGameData.matchState == 'postMatch') return false;

			const city: City = UnitToCity.get(GetChangingUnit());
			const country: Country = CityToCountry.get(city);
			const region: Region = CountryToRegion.get(country);
			const prevOwner: ActivePlayer | undefined = PlayerManager.getInstance().players.get(GetChangingUnitPrevOwner());
			const owner: ActivePlayer | undefined = PlayerManager.getInstance().players.get(city.getOwner());
			const teamManager: TeamManager = SettingsContext.getInstance().isFFA() ? null : TeamManager.getInstance();

			if (prevOwner) {
				const prevOwnerData: TrackedData = prevOwner.trackedData;
				const prevOwnerHandle: player = prevOwner.getPlayer();

				prevOwnerData.cities.cities.splice(prevOwnerData.cities.cities.indexOf(city), 1);
				prevOwnerData.countries.set(country, prevOwnerData.countries.get(country) - 1);

				if (country.getOwner() == prevOwnerHandle) {
					country.setOwner(null);

					if (prevOwner.status.isAlive()) {
						prevOwner.trackedData.income.income -= country.getCities().length;
						prevOwner.trackedData.income.delta -= country.getCities().length;
					}

					if (teamManager) {
						teamManager.getTeamFromPlayer(prevOwnerHandle).updateIncome(-country.getCities().length);
					}
				}

				if (region && region.owner == prevOwnerHandle) {
					region.setOwner(null);
					prevOwner.trackedData.income.income -= region.goldBonus;
					prevOwner.trackedData.income.delta -= region.goldBonus;

					if (teamManager) {
						teamManager.getTeamFromPlayer(prevOwnerHandle).updateIncome(-region.goldBonus);
					}
				}

				// Makes no sense to set a player as nomad during the game setup. Only during the game.
				if (prevOwnerData.cities.cities.length == 0 && GlobalGameData.matchState == 'inProgress') {
					prevOwner.status.set(PLAYER_STATUS.NOMAD);
				}

				if (teamManager) {
					teamManager.getTeamFromPlayer(prevOwnerHandle).updateCityCount(-1);
				}
			}

			if (owner) {
				const ownerData: TrackedData = owner.trackedData;
				const ownerHandle: player = owner.getPlayer();

				ownerData.cities.cities.push(city);
				ownerData.cities.max = Math.max(ownerData.cities.max, ownerData.cities.cities.length);

				if (ownerData.countries.has(country)) {
					ownerData.countries.set(country, ownerData.countries.get(country) + 1);
				} else {
					ownerData.countries.set(country, 1);
				}

				if (GlobalGameData.matchState == 'inProgress') {
					VictoryManager.getInstance().setLeader(owner);
				}

				if (ownerData.countries.get(country) == country.getCities().length) {
					country.setOwner(ownerHandle);

					if (owner.status.isAlive()) {
						ownerData.income.income += country.getCities().length;
						ownerData.income.delta += country.getCities().length;

						if (region && region.isOwnedByPlayer(ownerHandle)) {
							region.setOwner(ownerHandle);
							ownerData.income.income += region.goldBonus;
							ownerData.income.delta += region.goldBonus;
						}
					}

					if (ownerData.income.income > ownerData.income.max) {
						ownerData.income.max = ownerData.income.income;
					}

					if (teamManager) {
						teamManager.getTeamFromPlayer(ownerHandle).updateIncome(country.getCities().length);

						if (region && region.isOwnedByPlayer(ownerHandle)) {
							teamManager.getTeamFromPlayer(ownerHandle).updateIncome(region.goldBonus);
						}
					}

					if (GlobalGameData.matchState == 'inProgress') {
						ScoreboardManager.getInstance().setAlert(ownerHandle, country.getName());
					}
				}

				if (teamManager) {
					teamManager.getTeamFromPlayer(ownerHandle).updateCityCount(1);
				}
			}

			EventEmitter.getInstance().emit(EVENT_ON_CITY_CAPTURE, city, prevOwner, owner);

			return false;
		})
	);
}
