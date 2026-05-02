import { Wait } from 'src/app/utils/wait';
import { TreeManager } from '../../services/tree-service';
import { removeUnits } from '../utillity/remove-units';
import { neutralizeCities } from '../utillity/neutralize-cities';
import { resetCountries } from '../utillity/reset-countries';
import { BaseState } from '../state/base-state';
import { StatisticsController } from 'src/app/statistics/statistics-controller';
import { StateData } from '../state/state-data';
import { FogManager } from 'src/app/managers/fog-manager';
import { SharedSlotManager } from '../../services/shared-slot-manager';
import { TeamManager } from 'src/app/teams/team-manager';
import { ParticipantEntityManager } from 'src/app/utils/participant-entity';
import { GlobalGameData } from '../../state/global-game-state';
import { UnitKillTracker } from 'src/app/managers/unit-kill-tracker';
import { MinimapIconManager } from 'src/app/managers/minimap-icon-manager';
import { CityToCountry } from 'src/app/country/country-map';

export class ResetState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		this.runAsync();
	}

	async runAsync(): Promise<void> {
		try {
			print('Resetting match...');

			print('Neutralizing cities...');
			await neutralizeCities(5, 0.2);

			StatisticsController.getInstance().setViewVisibility(false);

			FogManager.getInstance().turnFogOff();

			// Initialize fog for all players
			SetTimeOfDayScale(0);
			SetTimeOfDay(12.0);

			print('Removing units...');
			await removeUnits(50, 0.2);

			print('Resetting countries...');
			await resetCountries();
			await Wait.forSeconds(1);

			print('Resetting kill tracker...');
			UnitKillTracker.getInstance().reset();
			print('Resetting minimap icons...');
			await MinimapIconManager.getInstance().reinitialize(Array.from(CityToCountry.keys()));

			print('Resetting trees...');
			await TreeManager.getInstance().reset();
			await Wait.forSeconds(1);

			SharedSlotManager.getInstance().reset();

			for (const val of GlobalGameData.matchPlayers) {
				val.trackedData.reset();
				val.trackedData.setKDMaps();
			}

			const participants = ParticipantEntityManager.getParticipantEntities();
			ParticipantEntityManager.executeByParticipantEntities(
				participants,
				(_) => {},
				(team) => {
					team.reset();
				}
			);
			for (const team of TeamManager.getInstance().getTeams()) {
				team.reset();
			}
			this.nextState(this.stateData);
		} catch (e) {
			print(`[ResetState] Error during reset: ${e}`);
		}
	}
}
