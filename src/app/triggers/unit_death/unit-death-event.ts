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
import { NameManager } from 'src/app/managers/names/name-manager';

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
			const dyingUnitOwner: GamePlayer = PlayerManager.getInstance().players.get(dyingUnitOwnerHandle);
			const killingUnitOwner: GamePlayer = PlayerManager.getInstance().players.get(killingUnitOwnerHandle);

			UnitLagManager.getInstance().untrackUnit(dyingUnit);

			debugPrint(`dyingUnitOwner: ${dyingUnitOwner}`);
			debugPrint(`killingUnitOwner: ${killingUnitOwner}`);

			debugPrint(`1. Guard ${GetUnitName(dyingUnit)} was killed by ${GetUnitName(killingUnit)}`);

			if (killingUnitOwner) {
				debugPrint(`Value: ${killingUnitOwner}`);
				debugPrint(
					`1. a) $ Unit Death Event: ${NameManager.getInstance().getDisplayName(killingUnitOwner.getPlayer())} killed ${GetUnitName(dyingUnit)}`
				);
				killingUnitOwner.onKill(dyingUnitOwnerHandle, dyingUnit);
				debugPrint(
					`1. b) $ Unit Death Event: ${NameManager.getInstance().getDisplayName(killingUnitOwner.getPlayer())} killed ${GetUnitName(dyingUnit)}`
				);
			}
			debugPrint(`2. a) Unit Death Event: ${GetUnitName(dyingUnit)} killed by ${GetUnitName(killingUnit)}`);
			if (dyingUnitOwner) dyingUnitOwner.onDeath(killingUnitOwnerHandle, dyingUnit);
			debugPrint(`2. b) Unit Death Event: ${GetUnitName(dyingUnit)} killed by ${GetUnitName(killingUnit)}`);

			debugPrint(`3. Unit Death Event: ${GetUnitName(dyingUnit)} killed by ${GetUnitName(killingUnit)}`);

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
