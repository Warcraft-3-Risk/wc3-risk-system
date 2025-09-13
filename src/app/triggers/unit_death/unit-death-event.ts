import { SettingsContext } from 'src/app/settings/settings-context';
import { TransportManager } from '../../managers/transport-manager';
import { PlayerManager } from '../../player/player-manager';
import { GamePlayer } from '../../player/types/game-player';
import { SPANWER_UNITS } from '../../spawner/spawner';
import { UNIT_TYPE } from '../../utils/unit-types';
import { HandleGuardDeath } from './handle-guard-death';
import { TeamManager } from 'src/app/teams/team-manager';
import { GlobalGameData } from 'src/app/game/state/global-game-state';
import { EVENT_ON_UNIT_KILLED } from 'src/app/utils/events/event-constants';
import { EventEmitter } from 'src/app/utils/events/event-emitter';
import { UnitLagManager } from 'src/app/game/services/unit-lag-manager';
import { debugPrint } from 'src/app/utils/debug-print';
import { ClientManager } from 'src/app/game/services/client-manager';

export function UnitDeathEvent() {
	const t: trigger = CreateTrigger();

	for (let i = 0; i < bj_MAX_PLAYER_SLOTS; i++) {
		// debugPrint(`Registering Unit Death Event for Player ${i} ${NameManager.getInstance().getDisplayName(Player(i))}`);
		TriggerRegisterPlayerUnitEvent(t, Player(i), EVENT_PLAYER_UNIT_DEATH, null);
	}

	TriggerAddCondition(
		t,
		Condition(() => {
			if (GlobalGameData.matchState === 'postMatch') return false;

			const dyingUnit: unit = GetTriggerUnit();
			const killingUnit: unit = GetKillingUnit();
			debugPrint(`Unit Death Event Triggered for ${GetUnitName(dyingUnit)} killed by ${GetUnitName(killingUnit)}`);
			const dyingUnitOwnerHandle: player = ClientManager.getInstance().getActualClientOwnerOfUnit(dyingUnit);
			const killingUnitOwnerHandle: player = ClientManager.getInstance().getActualClientOwnerOfUnit(killingUnit);
			const dyingUnitOwner: GamePlayer = PlayerManager.getInstance().players.get(dyingUnitOwnerHandle); ///////////////////////// EMPTY HERE!!!!!
			const killingUnitOwner: GamePlayer = PlayerManager.getInstance().players.get(killingUnitOwnerHandle);

			UnitLagManager.getInstance().untrackUnit(dyingUnit);

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

			if (SPANWER_UNITS.has(dyingUnit)) SPANWER_UNITS.get(dyingUnit).onDeath(dyingUnitOwnerHandle, dyingUnit);

			EventEmitter.getInstance().emit(EVENT_ON_UNIT_KILLED, killingUnit, dyingUnit);

			return false;
		})
	);
}
