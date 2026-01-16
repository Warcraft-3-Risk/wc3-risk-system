import { VictoryManager } from 'src/app/managers/victory-manager';
import { PlayerManager } from 'src/app/player/player-manager';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { SettingsContext } from 'src/app/settings/settings-context';
import { GlobalGameData } from '../../state/global-game-state';
import { BaseState } from '../state/base-state';
import { StatisticsController } from 'src/app/statistics/statistics-controller';
import { StateData } from '../state/state-data';
import { Quests } from 'src/app/quests/quests';
import { clearTickUI } from '../utillity/update-ui';
import { TeamManager } from 'src/app/teams/team-manager';
import { TreeManager } from '../../services/tree-service';
import { ReplayManager } from 'src/app/statistics/replay-manager';
import { CountdownMessage } from '../../../utils/messages';
import { HexColors } from '../../../utils/hex-colors';

export class SetupState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		this.run();
	}

	run(): void {
		CountdownMessage('Initializing the game');

		const message = `Use ${HexColors.TANGERINE}-help|r if you're new to the game.`;

		// Send message to all players as chat text (like -help command)
		PlayerManager.getInstance().playersAndObservers.forEach((activePlayer) => {
			DisplayTimedTextToPlayer(activePlayer.getPlayer(), 0, 0, 5, message);
		});

		clearTickUI();

		StatisticsController.getInstance().setViewVisibility(false);

		SettingsContext.getInstance().applyStrategy('Promode');
		SettingsContext.getInstance().applyStrategy('Diplomacy');

		// Setting up the scoreboard
		if (SettingsContext.getInstance().isFFA() || GlobalGameData.matchPlayers.length <= 2) {
			ScoreboardManager.getInstance().ffaSetup(GlobalGameData.matchPlayers);
			// get random player from list
			GlobalGameData.leader = GlobalGameData.matchPlayers[Math.floor(Math.random() * GlobalGameData.matchPlayers.length)];
		} else {
			const teams = [...TeamManager.getInstance().getTeams()];
			teams.forEach((team) => team.reset());
			// get random team from list
			GlobalGameData.leader = teams[Math.floor(Math.random() * teams.length)];
			ScoreboardManager.getInstance().teamSetup();
		}

		const observerKeys = [...PlayerManager.getInstance().observers.keys()];
		ScoreboardManager.getInstance().obsSetup(GlobalGameData.matchPlayers, observerKeys);

		VictoryManager.getInstance().reset();
		ScoreboardManager.getInstance().updateScoreboardTitle();
		EnableSelect(false, false);
		EnableDragSelect(false, false);

		StatisticsController.getInstance().useCurrentActivePlayers();
		Quests.getInstance().updatePlayersQuest();

		// To reset and reduce tree hp on first turn
		if (GlobalGameData.turnCount === 0) {
			TreeManager.getInstance().reset();
		}

		this.nextState(this.stateData);

		ReplayManager.getInstance().initialize();
	}
}
