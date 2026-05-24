import { OwnerResolution, resolveUnitOwner } from 'src/app/game/services/shared-slot-owner-resolution';

export interface UnitDeathContext {
	dyingUnit: unit;
	killingUnit: unit;
	dyingOwner: OwnerResolution;
	killingOwner?: OwnerResolution;
}

export function CaptureUnitDeathContext(dyingUnit: unit, killingUnit: unit): UnitDeathContext {
	return {
		dyingUnit,
		killingUnit,
		dyingOwner: resolveUnitOwner(dyingUnit),
		killingOwner: killingUnit ? resolveUnitOwner(killingUnit) : undefined,
	};
}
