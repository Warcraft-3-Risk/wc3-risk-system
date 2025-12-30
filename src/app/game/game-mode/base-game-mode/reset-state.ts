import { Wait } from 'src/app/utils/wait';
import { TreeManager } from '../../services/tree-service';
import { removeUnits } from '../utillity/remove-units';
import { resetCountries } from '../utillity/reset-countries';
import { BaseState } from '../state/base-state';
import { StatisticsController } from 'src/app/statistics/statistics-controller';
import { StateData } from '../state/state-data';
import { FogManager } from 'src/app/managers/fog-manager';
import { ClientManager } from '../../services/client-manager';
import { TeamManager } from 'src/app/teams/team-manager';
import { ParticipantEntityManager } from 'src/app/utils/participant-entity';
import { GlobalGameData } from '../../state/global-game-state';
import { UnitKillTracker } from 'src/app/managers/unit-kill-tracker';

export class ResetState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		this.runAsync();
	}

	async runAsync(): Promise<void> {
		print('Resetting match...');
		await Wait.forSeconds(2);

		StatisticsController.getInstance().setViewVisibility(false);

		FogManager.getInstance().turnFogOff();

		// Initialize fog for all players
		SetTimeOfDayScale(0);
		SetTimeOfDay(12.0);

		print('Resetting countries...');
		resetCountries();
		await Wait.forSeconds(1);
		print('Removing units...');
		removeUnits();
		await Wait.forSeconds(1);
		print('Resetting kill tracker...');
		UnitKillTracker.getInstance().reset();
		print('Resetting trees...');
		TreeManager.getInstance().reset();
		await Wait.forSeconds(1);

		ClientManager.getInstance().reset();

		GlobalGameData.matchPlayers.forEach((val) => {
			val.trackedData.reset();
			val.trackedData.setKDMaps();
		});

		const participants = ParticipantEntityManager.getParticipantEntities();
		ParticipantEntityManager.executeByParticipantEntities(
			participants,
			(_) => {},
			(team) => {
				team.reset();
			}
		);
		TeamManager.getInstance()
			.getTeams()
			.forEach((team) => {
				team.reset();
			});

		this.nextState(this.stateData);
	}
}
