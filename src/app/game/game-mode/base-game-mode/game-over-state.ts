import { NameManager } from 'src/app/managers/names/name-manager';
import { VictoryManager } from 'src/app/managers/victory-manager';
import { SettingsContext } from 'src/app/settings/settings-context';
import { GlobalGameData } from '../../state/global-game-state';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { StatisticsController } from 'src/app/statistics/statistics-controller';
import { ReplayManager } from 'src/app/statistics/replay-manager';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { Quests } from 'src/app/quests/quests';
import { FogManager } from 'src/app/managers/fog-manager';
import { PlayerManager } from 'src/app/player/player-manager';
import { LocalMessage } from 'src/app/utils/messages';
import { HexColors } from 'src/app/utils/hex-colors';


export class GameOverState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		GlobalGameData.matchState = 'postMatch';

		Quests.getInstance().updatePlayersQuest();

		// Set end data for all remaining active players - defeated players have had their end data set already as they were defeated
		PlayerManager.getInstance().activePlayersThatAreAlive.forEach((player) => {
			player.setEndData();
		});

		// Hide match scoreboard and show score screen
		ScoreboardManager.getInstance().destroyBoards();

		const nameManager = NameManager.getInstance();
		const isPromode = SettingsContext.getInstance().isPromode() || SettingsContext.getInstance().isChaosPromode();

		// Phase 1: Reset colors and set proper display names for the statistics board
		GlobalGameData.matchPlayers.forEach((player) => {
			SetPlayerState(player.getPlayer(), PLAYER_STATE_OBSERVER, 0);

			const handle = player.getPlayer();

			// Reset to original color (before client-manager overrides)
			nameManager.setColor(handle, nameManager.getOriginalColor(handle));
			nameManager.setName(handle, isPromode ? 'acct' : 'btag');

			if (!isPromode) {
				player.trackedData.bonus.hideUI();
			}
		});

		// Phase 2: Show statistics board (uses display names set above)
		if (isPromode) {
			VictoryManager.getInstance().addWinToLeader();
			VictoryManager.getInstance().showScore();
		} else {
			StatisticsController.getInstance().refreshView();
			StatisticsController.getInstance().setViewVisibility(true);
			StatisticsController.getInstance().writeStatisticsData();
		}

		// Phase 3: Set chat names to "ColorName (RealName)" observer format
		GlobalGameData.matchPlayers.forEach((player) => {
			nameManager.setName(player.getPlayer(), 'obs');
		});

		FogManager.getInstance().turnFogOff();

		SetTimeOfDayScale(0);
		SetTimeOfDay(12.0);

		ReplayManager.getInstance().onRoundEnd();
	}

	override onPlayerRestart(player: ActivePlayer) {
		if (SettingsContext.getInstance().isFFA()) {
			LocalMessage(GetLocalPlayer(), `${HexColors.RED}You can not restart in FFA mode!|r`, 'Sound\\Interface\\Error.flac');
		} else {
			this.nextState(this.stateData);
		}
	}
}
