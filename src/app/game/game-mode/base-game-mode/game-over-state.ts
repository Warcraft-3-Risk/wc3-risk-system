import { NameManager } from 'src/app/managers/names/name-manager';
import { VictoryManager } from 'src/app/managers/victory-manager';
import { SettingsContext } from 'src/app/settings/settings-context';
import { GlobalGameData } from '../../state/global-game-state';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { StatisticsController } from 'src/app/statistics/statistics-controller';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { Quests } from 'src/app/quests/quests';
import { FogManager } from 'src/app/managers/fog-manager';
import { PlayerManager } from 'src/app/player/player-manager';

export class GameOverState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		GlobalGameData.matchState = 'postMatch';

		Quests.getInstance().UpdateShuffledPlayerListQuest();

		// Set end data for all remaining active players - defeated players have had their end data set already as they were defeated
		PlayerManager.getInstance().playersAliveOrNomad.forEach((player) => {
			if (player.trackedData.turnDied == -1) {
				player.setEndData();
			}
		});

		// Hide match scoreboard and show score screen
		ScoreboardManager.getInstance().destroyBoards();
		GlobalGameData.matchPlayers.forEach((player) => {
			if (SettingsContext.getInstance().isPromode()) {
				NameManager.getInstance().setName(player.getPlayer(), 'acct');
			} else {
				NameManager.getInstance().setName(player.getPlayer(), 'btag');
				player.trackedData.bonus.hideUI();
			}
		});
		if (SettingsContext.getInstance().isPromode()) {
			VictoryManager.getInstance().updateWinTracker();
		} else {
			StatisticsController.getInstance().refreshView();
			StatisticsController.getInstance().setViewVisibility(true);
			StatisticsController.getInstance().writeStatisticsData();
		}

		FogManager.getInstance().turnFogOff();

		SetTimeOfDayScale(0);
		SetTimeOfDay(12.0);
	}

	onPlayerRestart(player: ActivePlayer) {
		const playerIsParticipant = GlobalGameData.matchPlayers.find((x) => x.getPlayer() == player.getPlayer());
		if (playerIsParticipant) {
			this.nextState(this.stateData);
		}
	}
}
