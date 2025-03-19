import { NameManager } from 'src/app/managers/names/name-manager';
import { VictoryManager } from 'src/app/managers/victory-manager';
import { PlayerManager } from 'src/app/player/player-manager';
import { PLAYER_STATUS } from 'src/app/player/status/status-enum';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { SettingsContext } from 'src/app/settings/settings-context';
import { GlobalGameData } from '../../state/global-game-state';
import { BaseState } from '../state/base-state';
import { StatisticsController } from 'src/app/statistics/statistics-controller';
import { StateData } from '../state/state-data';
import { Quests } from 'src/app/quests/quests';
import { clearTickUI } from '../utillity/update-ui';
import { TreeManager } from '../../services/tree-service';
import { debugPrint } from 'src/app/utils/debug-print';

export class SetupState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		this.run();
	}

	run(): void {
		FogEnable(false);

		clearTickUI();

		StatisticsController.getInstance().setViewVisibility(false);

		// Assign player names as colors for non-promode games
		if (!SettingsContext.getInstance().isPromode()) {
			GlobalGameData.matchPlayers.forEach((val) => {
				NameManager.getInstance().setName(val.getPlayer(), 'color');
			});
		}

		// Remove irrelevant players from the game
		GlobalGameData.matchPlayers.forEach((val) => {
			val.trackedData.reset();
			val.trackedData.setKDMaps();
			if (GetPlayerSlotState(val.getPlayer()) == PLAYER_SLOT_STATE_PLAYING) {
				val.status.set(PLAYER_STATUS.ALIVE);
			} else {
				val.status.set(PLAYER_STATUS.LEFT);

				PlayerManager.getInstance().players.delete(val.getPlayer());
			}
		});

		const players = [...PlayerManager.getInstance().players.values()];

		GlobalGameData.prepareMatchData(players);

		// Prepare stat tracking
		GlobalGameData.matchPlayers.forEach((player) => {
			SetPlayerState(player.getPlayer(), PLAYER_STATE_RESOURCE_GOLD, 0);
			player.status.set(PLAYER_STATUS.ALIVE);
			player.status.status = PLAYER_STATUS.ALIVE;
			player.trackedData.bonus.showForPlayer(player.getPlayer());
			player.trackedData.bonus.repositon();
		});

		if (SettingsContext.getInstance().isFFA() || GlobalGameData.matchPlayers.length <= 2) {
			ScoreboardManager.getInstance().ffaSetup(GlobalGameData.matchPlayers);
		} else {
			ScoreboardManager.getInstance().teamSetup();
		}

		ScoreboardManager.getInstance().obsSetup(GlobalGameData.matchPlayers, [...PlayerManager.getInstance().observers.keys()]);

		VictoryManager.getInstance().updateAndGetGameState();
		ScoreboardManager.getInstance().updateScoreboardTitle();

		EnableSelect(false, false);
		EnableDragSelect(false, false);
		FogEnable(true);

		StatisticsController.getInstance().useCurrentActivePlayers();

		Quests.getInstance().UpdateShuffledPlayerListQuest();

		// To reset and reduce tree hp on first turn
		if (GlobalGameData.turnCount === 0) {
			TreeManager.getInstance().reset();
		}

		this.nextState(this.stateData);
	}
}
