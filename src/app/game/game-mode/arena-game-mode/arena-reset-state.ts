import { ArenaManager } from 'src/app/managers/arena-manager';
import { UnitKillTracker } from 'src/app/managers/unit-kill-tracker';
import { TeamManager } from 'src/app/teams/team-manager';
import { GlobalGameData } from '../../state/global-game-state';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { removeUnits } from '../utillity/remove-units';

/**
 * Arena version of ResetState. An arena round only touches the arena cities and the armies, so it skips the
 * full map reset (every country, trees, minimap) and its waits - the next round follows right away.
 */
export class ArenaResetState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		removeUnits();
		ArenaManager.getInstance().resetCities();
		UnitKillTracker.getInstance().reset();

		GlobalGameData.matchPlayers.forEach((player) => {
			player.trackedData.reset();
			player.trackedData.setKDMaps();
		});

		TeamManager.getInstance()
			.getTeams()
			.forEach((team) => team.reset());

		this.nextState(this.stateData);
	}
}
