import { DefaultCityType, CityGuardXOffSet, CityGuardYOffSet, CityRegionSize } from 'src/app/configs/city-settings';
import { DefaultGuardType, DefaultBarrackType } from 'src/app/configs/country-settings';
import { UNIT_ID } from 'src/app/configs/unit-id';
import { Resetable } from 'src/app/interfaces/resettable';
import { EnterRegionTrigger } from 'src/app/triggers/enter-region-event';
import { LeaveRegionTrigger } from 'src/app/triggers/leave-region-event';
import { UnitTrainedTrigger } from 'src/app/triggers/unit-trained-event';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { CityBehaviorRegistry } from '../behaviors/city.behavior-registry';
import { City } from '../city';
import { CityType } from '../city-type';
import { Barrack } from '../components/barrack';
import { Guard } from '../components/guard';
import { HandleToCity } from '../handle-to-city';
import { ICityBuilder } from './city-builder.interface';
import { ICityData } from './city-data.interface';
import { GuardFactory } from './guard-factory';

export class CityBuilder implements ICityBuilder, Resetable {
	private x: number;
	private y: number;
	private guardType: number;
	private cityType: CityType;

	public setData(cityData: ICityData) {
		this.x = cityData.x;
		this.y = cityData.y;
		this.guardType = cityData.guardType || DefaultGuardType;
		this.cityType = cityData.cityType || DefaultCityType;
	}

	public build(): City {
		const barrackUnit = CreateUnit(NEUTRAL_HOSTILE, DefaultBarrackType, this.x, this.y, 270);
		const barrack = new Barrack(barrackUnit);
		const offsetX = this.x - CityGuardXOffSet;
		const offsetY = this.y - CityGuardYOffSet;
		const cop = CreateUnit(NEUTRAL_HOSTILE, UNIT_ID.CONTROL_POINT, offsetX, offsetY, 270);

		SetUnitInvulnerable(cop, true);

		const behavior = CityBehaviorRegistry.getBehavior(this.cityType);
		const guardType = this.guardType;

		const guardFactory: GuardFactory = (city: City): Guard => {
			return new Guard(guardType, offsetX, offsetY, city);
		};

		const city = new City(barrack, guardFactory, cop, behavior);
		HandleToCity.set(barrack.getUnit(), city);
		HandleToCity.set(city.getGuard().getUnit(), city);
		this.setRegion(city);
		TriggerRegisterUnitEvent(UnitTrainedTrigger, barrack.getUnit(), EVENT_UNIT_TRAIN_FINISH);
		city.setOwner(NEUTRAL_HOSTILE);

		return city;
	}

	public reset(): void {
		this.x = null;
		this.y = null;
		this.guardType = null;
		this.cityType = null;
	}

	private setRegion(city: City): void {
		const rect = Rect(
			city.getGuard().getDefaultX() - CityRegionSize / 2,
			city.getGuard().getDefaultY() - CityRegionSize / 2,
			city.getGuard().getDefaultX() + CityRegionSize / 2,
			city.getGuard().getDefaultY() + CityRegionSize / 2
		);

		const region = CreateRegion();

		RegionAddRect(region, rect);
		RemoveRect(rect);
		TriggerRegisterEnterRegion(EnterRegionTrigger, region, null);
		TriggerRegisterLeaveRegion(LeaveRegionTrigger, region, null);
		HandleToCity.set(region, city);
	}
}
