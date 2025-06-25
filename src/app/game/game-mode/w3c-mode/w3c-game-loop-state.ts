import { PlayerManager } from 'src/app/player/player-manager';
import { GameLoopState } from '../base-game-mode/game-loop-state';
import { W3CData } from '../mode/w3c-mode';
import { SettingsContext } from 'src/app/settings/settings-context';
import { TeamManager } from 'src/app/teams/team-manager';
import { ParticipantEntity, ParticipantEntityManager } from 'src/app/utils/participant-entity';

export class W3CGameLoopState extends GameLoopState<W3CData> {
	onEndTurn(turn: number): void {
		super.onEndTurn(turn);

		// If the opponent of GetLocalPlayer() has double the number of cities, then GetLocalPlayer() is notified of this.
		// They should then get a LocalMessage that indicates that they are losing and should consider running -ff.
		const participants: ParticipantEntity[] = SettingsContext.getInstance().isFFA()
			? Array.from(PlayerManager.getInstance().playersAliveOrNomad.values())
			: TeamManager.getInstance().getActiveTeams();

		participants.forEach((participant) => {
			const opponents = [...participants.filter((p) => p != participant)];

			const participantCityCount = ParticipantEntityManager.getCityCount(participant);
			const opponentCityCounts = opponents.map((p) => ParticipantEntityManager.getCityCount(p)).reduce((a, b) => a + b, 0);
			if (opponentCityCounts >= participantCityCount * 2) {
				ParticipantEntityManager.localMessage(
					participant,
					'You are far behind in city count!\n\nConsider running -ff to concede the round.',
					'war3map.w3a\\Sounds\\UI\\UI_Concede.wav',
					15
				);
				opponents.forEach((opponent) => {
					ParticipantEntityManager.localMessage(
						opponent,
						`${ParticipantEntityManager.getDisplayName(participant, true)} is far behind in city count!\n\nSuggest that they run -ff to concede the round.`,
						'war3map.w3a\\Sounds\\UI\\UI_Concede.wav',
						15
					);
				});
			}
		});
	}
}
