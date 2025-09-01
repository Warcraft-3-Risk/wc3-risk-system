import { NameManager } from 'src/app/managers/names/name-manager';
import { VictoryManager } from 'src/app/managers/victory-manager';
import { SettingsContext } from 'src/app/settings/settings-context';
import { GlobalGameData } from '../../state/global-game-state';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { StatisticsController } from 'src/app/statistics/statistics-controller';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { Quests } from 'src/app/quests/quests';
import { FogManager } from 'src/app/managers/fog-manager';
import { Wait } from 'src/app/utils/wait';
import { PlayerManager } from 'src/app/player/player-manager';
import { debugPrint } from 'src/app/utils/debug-print';
import { ParticipantEntityManager } from 'src/app/utils/participant-entity';

export class W3CGameOverState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		this.runAsync();
	}

	async runAsync(): Promise<void> {
		GlobalGameData.matchState = 'postMatch';

		Quests.getInstance().updatePlayersQuest();

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
			VictoryManager.getInstance().addWinToLeader();
		} else {
			StatisticsController.getInstance().refreshView();
			StatisticsController.getInstance().setViewVisibility(true);
			StatisticsController.getInstance().writeStatisticsData();
		}

		FogManager.getInstance().turnFogOff();

		SetTimeOfDayScale(0);
		SetTimeOfDay(12.0);

		await Wait.forSeconds(1);

		const player: player = VictoryManager.getInstance().wonBestOf(2);
		if (player) {
			debugPrint(
				`${ParticipantEntityManager.getDisplayName(PlayerManager.getInstance().players.get(player))} has won the best of 2 series.`
			);
			CustomVictoryBJ(player, true, true);
			ClearTextMessages();

			const loser: player = VictoryManager.getInstance().getLoser();

			CustomDefeatBJ(loser, 'You have been defeated!');
		} else {
			this.nextState(this.stateData);
		}
	}
}
