
import { UNIT_ID } from 'src/configs/unit-id';
import { City } from '../city/city';
import { UnitToCity } from '../city/city-map';
import { countryTracker } from '../game/services/country-creator';
import { Coordinates } from '../interfaces/coordinates';
import { UNIT_TYPE } from '../utils/unit-types';
import { PLAYER_SLOTS } from '../utils/utils';
import { File } from 'w3ts';

export function CountryCreatorCountryEvent() {
    const t: trigger = CreateTrigger();
    TriggerRegisterPlayerChatEvent(
        t,
        Player(0),
        "-country",
        false
    );

    TriggerAddAction(t, () => {
        const message = GetEventPlayerChatString()
        const country = message.substring(9, message.length);
        let unassignedCities = countryTracker.getUnassignedCities()
        if (unassignedCities.length == 0)
            DisplayTextToPlayer(Player(0), 0, 0, "Select some cities to assign them first.")
        let unassignedSpawner = countryTracker.getUnassignedSpawner()
        if (unassignedSpawner !== null) {
            countryTracker.createCountryFromUnassigned(country, unassignedSpawner)
            DisplayTextToPlayer(Player(0), 0, 0, `Created ${country}.`)
        }
        else
            DisplayTextToPlayer(Player(0), 0, 0, "Select a spawner first.")
    });
}

export function CountryCreatorSaveEvent() {
    const t: trigger = CreateTrigger();
    TriggerRegisterPlayerChatEvent(
        t,
        Player(0),
        "-save",
        true
    );

    TriggerAddAction(t, () => {
        if (countryTracker.getCountries().length === 0)
            DisplayTextToPlayer(Player(0), 0, 0, "No countries saved.")
        else {
            DisplayTextToPlayer(Player(0), 0, 0, "Saving countries:")
            countryTracker.generateCountrySettings()
        }
    });
}

export function CountryCreatorCoordinatesEvent() {
    const t: trigger = CreateTrigger();
    for (let i = 0; i < PLAYER_SLOTS; i++) {
        TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_SELECTED);
    }

    TriggerAddCondition(
        t,
        Condition(() => {

            let coords: Coordinates = {
                x: GetUnitX(GetTriggerUnit()),
                y: GetUnitY(GetTriggerUnit())
            };

            if (GetUnitTypeId(GetTriggerUnit()) === UNIT_ID.SPAWNER) {
                DisplayTextToPlayer(Player(0), 0, 0, "Spawner for city creation selected.")
                countryTracker.addUnassignedSpawner(coords)
            }


            if (IsUnitType(GetTriggerUnit(), UNIT_TYPE.CITY) && UnitToCity.get(GetTriggerUnit()) == null) {

                let countryName = countryTracker.findCountryByCityCoordinates(coords)

                if (countryName == null) {
                    DisplayTextToPlayer(Player(0), 0, 0, "Added city to unassigned cities. When you are ready, select a spawner and then type -country 'name' to create the country.")
                    if (GetUnitTypeId(GetTriggerUnit()) === UNIT_ID.PORT)
                        countryTracker.addUnassignedCity({ coords: coords, typeId: 'UNIT_ID.PORT', cityType: 'port' })
                    else
                        countryTracker.addUnassignedCity({ coords: coords, typeId: 'UNIT_ID.CITY', cityType: 'land' })
                }
                else
                    DisplayTextToPlayer(Player(0), 0, 0, `City is already assigned to ${countryName}`)
            }

        })
    );
}
