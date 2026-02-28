import { PlayerManager } from 'src/app/player/player-manager';
import { PLAYER_STATUS } from 'src/app/player/status/status-enum';
import { GlobalGameData } from '../../state/global-game-state';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { TeamManager } from 'src/app/teams/team-manager';
import { ParticipantEntityManager } from 'src/app/utils/participant-entity';

export class UpdatePlayerStatusState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		// Capture initial human player count before any cleanup
		PlayerManager.getInstance().captureInitialHumanPlayerCount();

		// Remove irrelevant players from the game
		const playersToRemove: player[] = [];

		PlayerManager.getInstance().players.forEach((activePlayer, playerHandle) => {
			if (GetPlayerSlotState(playerHandle) !== PLAYER_SLOT_STATE_PLAYING) {
				playersToRemove.push(playerHandle);
			}
		});

		playersToRemove.forEach((playerHandle) => {
			PlayerManager.getInstance().players.delete(playerHandle);
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

		this.nextState(this.stateData);
	}
}
