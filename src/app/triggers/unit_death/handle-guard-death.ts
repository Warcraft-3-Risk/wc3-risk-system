import { UnitToCity } from 'src/app/city/city-map';
import { LandCity } from 'src/app/city/land-city';
import { PortCity } from 'src/app/city/port-city';
import { SelfKillHandler as SelfKillHandler } from './self-kill-handler';
import { InvalidGuardHandler } from './invalid-guard-handler';
import { AlliedKillHandler } from './allied-kill-handler';
import { EnemyKillHandler } from './enemy-kill-handler';

export function HandleGuardDeath(dyingUnit: unit, killingUnit: unit) {
	const city: LandCity | PortCity = UnitToCity.get(dyingUnit);
	// debugPrint(`Guard ${GetUnitName(dyingUnit)} is dying in city ${UnitToCity.get(dyingUnit).barrack}`);

	if (!city) return;

	//Check if killing unit is owned
	let guardChoice: boolean = SelfKillHandler(city, dyingUnit, killingUnit);

	//Check if killing unit is ally
	if (!guardChoice) guardChoice = AlliedKillHandler(city, dyingUnit, killingUnit);

	//Check if killing unit is enemy
	if (!guardChoice) guardChoice = EnemyKillHandler(city, dyingUnit, killingUnit);

	//Handle cases where no valid guard is found
	if (!guardChoice) {
		InvalidGuardHandler(city, killingUnit);
	}
}
