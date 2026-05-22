import { CityDistributeState } from '../base-game-mode/city-distribute-state';
import { GameOverState } from '../base-game-mode/game-over-state';
import { ResetState } from '../base-game-mode/reset-state';
import { SetPromodeTempVisionState } from '../promode-game-mode/set-promode-temp-vision-state';
import { SetupState } from '../base-game-mode/setup-state';
import { BaseMode } from './base-mode';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { PromodeCountdownState } from '../promode-game-mode/promode-countdown-state';
import { ApplyFogState } from '../base-game-mode/apply-fog-state';
import { ProModeGameLoopState } from '../promode-game-mode/promode-game-loop-state';
import { UpdatePlayerStatusState } from '../base-game-mode/update-player-status-state';
import { EnableControlsState } from '../base-game-mode/enable-controls-state';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { TeamManager } from 'src/app/teams/team-manager';

export class PromodeData implements StateData {}

export class PromodeMode extends BaseMode<PromodeData> {
	protected setupStates() {
		const states = [
			new UpdatePlayerStatusState(),
			new SetupState(),
			new ApplyFogState(),
			new CityDistributeState(),
			new SetPromodeTempVisionState(),
			new PromodeCountdownState(),
			new EnableControlsState(),
			new ProModeGameLoopState(),
			new GameOverState(),
			new ResetState(),
		] as BaseState<PromodeData>[];

		return states.map((s) => this.wrapState(s));
	}

	protected setupData(): PromodeData {
		return new PromodeData();
	}

	wrapState<T extends StateData>(state: BaseState<T>): BaseState<T> {
		const originalOnPlayerForfeit = state.onPlayerForfeit.bind(state);
		const originalOnPlayerLeft = state.onPlayerLeft.bind(state);

		const handleTeamForfeit = (player: ActivePlayer) => {
			const team = TeamManager.getInstance().getTeamFromPlayer(player.getPlayer());
			if (team) {
				const members = team.getMembers();
				if (members.length > 1) {
					let forfeitCount = 0;
					members.forEach((member) => {
						if (member.status.isEliminated()) {
							forfeitCount++;
						}
					});

					if (forfeitCount / members.length >= 0.5) {
						members.forEach((member) => {
							if (member.status.isActive()) {
								originalOnPlayerForfeit(member);
							}
						});
					}
				}
			}
		};

		state.onPlayerForfeit = (player: ActivePlayer) => {
			originalOnPlayerForfeit(player);
			handleTeamForfeit(player);
		};

		state.onPlayerLeft = (player: ActivePlayer) => {
			originalOnPlayerLeft(player);
			handleTeamForfeit(player);
		};

		return state;
	}
}
