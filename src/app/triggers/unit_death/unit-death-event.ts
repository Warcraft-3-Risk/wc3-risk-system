import { SettingsContext } from 'src/app/settings/settings-context';
import { TransportManager } from '../../managers/transport-manager';
import { PlayerManager } from '../../player/player-manager';
import { GamePlayer } from '../../player/types/game-player';
import { SPAWNER_UNITS } from '../../spawner/spawner';
import { UNIT_TYPE } from '../../utils/unit-types';
import { HandleGuardDeath } from './handle-guard-death';
import { TeamManager } from 'src/app/teams/team-manager';
import { GlobalGameData } from 'src/app/game/state/global-game-state';
import { EVENT_ON_UNIT_KILLED } from 'src/app/utils/events/event-constants';
import { EventEmitter } from 'src/app/utils/events/event-emitter';
import { UnitLagManager } from 'src/app/game/services/unit-lag-manager';
import { debugPrint } from 'src/app/utils/debug-print';
import { ClientManager } from 'src/app/game/services/client-manager';
import { UnitKillTracker } from 'src/app/managers/unit-kill-tracker';
import { updateUnitNameWithKillValue } from '../../utils/unit-name-helper';

export function UnitDeathEvent() {
	const t: trigger = CreateTrigger();

	for (let i = 0; i < bj_MAX_PLAYER_SLOTS; i++) {
		TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_DEATH, null);
	}

	TriggerAddCondition(
		t,
		Condition(() => {
			if (GlobalGameData.matchState === 'postMatch') return false;

			const dyingUnit: unit = GetTriggerUnit();
			const killingUnit: unit = GetKillingUnit();
			debugPrint(`Unit Death Event Triggered for ${GetUnitName(dyingUnit)} killed by ${GetUnitName(killingUnit)}`);
			const dyingUnitOwnerHandle: player = ClientManager.getInstance().getOwnerOfUnit(dyingUnit);
			const killingUnitOwnerHandle: player = ClientManager.getInstance().getOwnerOfUnit(killingUnit);
			const dyingUnitOwner: GamePlayer = PlayerManager.getInstance().players.get(dyingUnitOwnerHandle);
			const killingUnitOwner: GamePlayer = PlayerManager.getInstance().players.get(killingUnitOwnerHandle);

			UnitLagManager.getInstance().untrackUnit(dyingUnit);

			// Track kill for the killing unit
			if (killingUnit) {
				UnitKillTracker.getInstance().incrementKills(killingUnit);
			}

			// Track kill value and update unit name (only for non-buildings and non-deny kills)
			try {
				if (killingUnit && !IsUnitType(killingUnit, UNIT_TYPE.BUILDING)) {
					// Only count kills of enemy/allied units, not own units (denies)
					if (killingUnitOwnerHandle !== dyingUnitOwnerHandle) {
						const pointValue = GetUnitPointValue(dyingUnit);
						const totalKillValue = UnitKillTracker.getInstance().addKillValue(killingUnit, pointValue);
						updateUnitNameWithKillValue(killingUnit, totalKillValue);
					} else {
						debugPrint(`[KILL TRACKER] Skipping deny - unit killed its own unit`);
					}
				} else if (killingUnit) {
					debugPrint(`[KILL TRACKER] Skipping name update - killing unit is a building`);
				}
			} catch (e) {
				debugPrint(`[KILL TRACKER ERROR] Exception: ${e}`);
			}

			// Remove the dying unit from kill tracking
			UnitKillTracker.getInstance().removeUnit(dyingUnit);

			if (killingUnitOwner) {
				killingUnitOwner.onKill(
					dyingUnitOwnerHandle,
					dyingUnit,
					PlayerManager.getInstance().playerControllers.get(killingUnitOwnerHandle) === MAP_CONTROL_USER &&
						PlayerManager.getInstance().playerControllers.get(dyingUnitOwnerHandle) === MAP_CONTROL_USER
				);
			}
			if (dyingUnitOwner)
				dyingUnitOwner.onDeath(
					killingUnitOwnerHandle,
					dyingUnit,
					PlayerManager.getInstance().playerControllers.get(killingUnitOwnerHandle) === MAP_CONTROL_USER &&
						PlayerManager.getInstance().playerControllers.get(dyingUnitOwnerHandle) === MAP_CONTROL_USER
				);

			if (!SettingsContext.getInstance().isFFA() && !IsPlayerAlly(killingUnitOwnerHandle, dyingUnitOwnerHandle)) {
				const teamManager: TeamManager = TeamManager.getInstance();
				if (killingUnitOwner) teamManager.getTeamFromPlayer(killingUnitOwnerHandle).updateKillCount(GetUnitPointValue(dyingUnit));
				if (dyingUnitOwner) teamManager.getTeamFromPlayer(dyingUnitOwnerHandle).updateDeathCount(GetUnitPointValue(dyingUnit));
			}

			if (IsUnitType(dyingUnit, UNIT_TYPE.GUARD)) HandleGuardDeath(dyingUnit, killingUnit);

			TransportManager.getInstance().onDeath(killingUnit, dyingUnit);

			if (SPAWNER_UNITS.has(dyingUnit)) SPAWNER_UNITS.get(dyingUnit).onDeath(dyingUnitOwnerHandle, dyingUnit);

			EventEmitter.getInstance().emit(EVENT_ON_UNIT_KILLED, killingUnit, dyingUnit);

			return false;
		})
	);
}
