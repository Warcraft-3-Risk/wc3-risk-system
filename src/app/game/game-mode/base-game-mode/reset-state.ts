import { Wait } from 'src/app/utils/wait';
import { TreeManager } from '../../services/tree-service';
import { removeUnits } from '../utillity/remove-units';
import { resetCountries } from '../utillity/reset-countries';
import { BaseState } from '../state/base-state';
import { StatisticsController } from 'src/app/statistics/statistics-controller';
import { StateData } from '../state/state-data';
import { FogManager } from 'src/app/managers/fog-manager';
import { TeamManager } from 'src/app/teams/team-manager';
import { ParticipantEntityManager } from 'src/app/utils/participant-entity';
import { GlobalGameData } from '../../state/global-game-state';
import { UnitKillTracker } from 'src/app/managers/unit-kill-tracker';
import { MinimapIconManager } from 'src/app/managers/minimap-icon-manager';
import { NameManager } from 'src/app/managers/names/name-manager';

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
		// Custom promode minimap only - skipped entirely in every other mode
		if (MinimapIconManager.getInstance().isEnabled()) {
			await MinimapIconManager.getInstance().reinitialize();
		}
		print('Resetting trees...');
		TreeManager.getInstance().reset();
		await Wait.forSeconds(1);

		print('Resetting players...');
		this.resetPlayersAndAlliances();

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

	// Restores every non-observer slot to its lobby color and colored name, and breaks all alliances between them.
	private resetPlayersAndAlliances(): void {
		const nameManager = NameManager.getInstance();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const p = Player(i);

			if (IsPlayerObserver(p)) continue;

			nameManager.setColor(p, nameManager.getLobbyColor(p));
			nameManager.setName(p, 'color');

			for (let j = 0; j < bj_MAX_PLAYERS; j++) {
				const target = Player(j);

				if (IsPlayerObserver(target)) continue;

				SetPlayerAlliance(p, target, ALLIANCE_PASSIVE, false);
				SetPlayerAlliance(p, target, ALLIANCE_HELP_REQUEST, false);
				SetPlayerAlliance(p, target, ALLIANCE_HELP_RESPONSE, false);
				SetPlayerAlliance(p, target, ALLIANCE_SHARED_XP, false);
				SetPlayerAlliance(p, target, ALLIANCE_SHARED_SPELLS, false);
				SetPlayerAlliance(p, target, ALLIANCE_SHARED_VISION, false);
				SetPlayerAlliance(p, target, ALLIANCE_SHARED_CONTROL, false);
				SetPlayerAlliance(p, target, ALLIANCE_SHARED_ADVANCED_CONTROL, false);
			}
		}
	}
}
