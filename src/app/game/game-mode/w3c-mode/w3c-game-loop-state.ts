import { GameLoopState } from '../base-game-mode/game-loop-state';
import { W3CData } from '../mode/w3c-mode';
import { ParticipantEntity, ParticipantEntityManager } from 'src/app/utils/participant-entity';
import { PLAYER_STATUS } from 'src/app/player/status/status-enum';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { debugPrint } from 'src/app/utils/debug-print';
import { CITIES_TO_WIN_WARNING_RATIO } from 'src/configs/game-settings';

export class W3CGameLoopState extends GameLoopState<W3CData> {
	onEndTurn(turn: number): void {
		super.onEndTurn(turn);

		// If the opponent of GetLocalPlayer() has double the number of cities, then GetLocalPlayer() is notified of this.
		// They should then get a LocalMessage that indicates that they are losing and should consider running -ff.
		const participants: ParticipantEntity[] = ParticipantEntityManager.getParticipantEntities();

		participants.forEach((participant) => {
			const opponents = [...participants.filter((p) => p != participant)];

			const participantCityCount = ParticipantEntityManager.getCityCount(participant);
			const opponentCityCounts = opponents.map((p) => ParticipantEntityManager.getCityCount(p)).reduce((a, b) => a + b, 0);
			debugPrint(
				`Checking city count for participant ${ParticipantEntityManager.getDisplayName(participant)}: ${participantCityCount} vs opponents: ${opponentCityCounts}`
			);
			if (opponentCityCounts >= participantCityCount * 2) {
				ParticipantEntityManager.localMessage(
					participant,
					'You are too far behind in city count!\n\nThis round is considered a loss.',
					'war3map.w3a\\Sounds\\UI\\UI_Concede.wav',
					15
				);
				opponents.forEach((opponent) => {
					ParticipantEntityManager.localMessage(
						opponent,
						`${ParticipantEntityManager.getDisplayName(participant, true)} is too far behind in city count!\n\nThis round is a loss for them.`,
						'war3map.w3a\\Sounds\\UI\\UI_Concede.wav',
						15
					);
				});
				ParticipantEntityManager.executeByParticipantEntity(
					participant,
					(activePlayer) => {
						debugPrint(`Setting status of ${ParticipantEntityManager.getDisplayName(activePlayer)} to DEAD due to city count.`);
						activePlayer.status.set(PLAYER_STATUS.DEAD);
					},
					(team) => {
						debugPrint(`Setting status of ${ParticipantEntityManager.getDisplayName(team)} to DEAD due to city count.`);
						team.getMembers().forEach((activePlayer) => activePlayer.status.set(PLAYER_STATUS.DEAD));
					}
				);
			} else if (opponentCityCounts >= participantCityCount * 2 * CITIES_TO_WIN_WARNING_RATIO) {
				debugPrint(`Participant ${ParticipantEntityManager.getDisplayName(participant)} is losing in city count.`);
				ParticipantEntityManager.localMessage(
					participant,
					"You are losing in city count!\n\nYou will automatically lose if you dip below half of your opponent's city count!",
					'war3map.w3a\\Sounds\\UI\\UI_Concede.wav',
					15
				);
				opponents.forEach((opponent) => {
					ParticipantEntityManager.localMessage(
						opponent,
						`${ParticipantEntityManager.getDisplayName(participant, true)} is losing in city count! \n\nThey will automatically lose if they dip below half of your city count!`,
						'war3map.w3a\\Sounds\\UI\\UI_Concede.wav',
						15
					);
				});
			}
		});
	}
}
