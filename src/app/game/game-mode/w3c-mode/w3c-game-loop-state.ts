import { PlayerManager } from 'src/app/player/player-manager';
import { GameLoopState } from '../base-game-mode/game-loop-state';
import { W3CData } from '../mode/w3c-mode';
import { LocalMessage } from 'src/app/utils/messages';
import { W3C_MODE_ENABLED } from 'src/app/utils/map-info';
import { GlobalGameData } from '../../state/global-game-state';

export class W3CGameLoopState extends GameLoopState<W3CData> {
	onEndTurn(turn: number): void {
		super.onEndTurn(turn);

		// If the opponent of GetLocalPlayer() has double the number of cities, then GetLocalPlayer() is notified of this.
		// They should then get a LocalMessage that indicates that they are losing and should consider running -ff.
		const players = PlayerManager.getInstance().players;
		players.forEach((player) => {
			const opponents = [...PlayerManager.getInstance().players.values()].filter((p) => p.getPlayer() !== player.getPlayer());
			const localPlayerCityCount = player.trackedData.cities.cities.length;
			const opponentCityCounts = opponents.map((p) => p.trackedData.cities.cities.length).reduce((a, b) => a + b, 0);
			if (opponentCityCounts >= localPlayerCityCount * 2) {
				if (GetLocalPlayer() === player.getPlayer()) {
					this.announceMessageToEachPlayers(
						[player.getPlayer()],
						'You are far behind in city count!\n\nConsider running -ff to concede the round.'
					);
				} else {
					this.announceMessageToEachPlayers(
						opponents.map((x) => x.getPlayer()),
						'Your opponent is far behind in city count!\n\nSuggest that they run -ff to concede the round.'
					);
				}
			}
		});
	}

	announceMessageToEachPlayers(players: player[], message: string): void {
		players.forEach((player) => {
			if (GetLocalPlayer() === player) {
				LocalMessage(GetLocalPlayer(), message, 'Sound\\Interface\\ItemReceived.flac', 15);
			}
		});
	}
}
