import { City } from 'src/app/city/city';
import { ArenaManager } from 'src/app/managers/arena-manager';
import { FogManager } from 'src/app/managers/fog-manager';
import { NameManager } from 'src/app/managers/names/name-manager';
import { PlayerManager } from 'src/app/player/player-manager';
import { ScoreboardManager } from 'src/app/scoreboard/scoreboard-manager';
import { HexColors } from 'src/app/utils/hex-colors';
import { GlobalMessage, LocalMessage } from 'src/app/utils/messages';
import { setTickUI } from '../utillity/update-ui';
import { ARENA_ROUND_DURATION } from 'src/configs/game-settings';
import { GlobalGameData } from '../../state/global-game-state';
import { BaseState } from '../state/base-state';
import { StateData } from '../state/state-data';
import { announceArenaChampion, getArenaLeaders } from './arena-session-end';

/**
 * Prepares an Arena round: pairs the players along the arena ladder, gives every fighting player their city and
 * their match's random army (the same for both opponents), and points every camera at its fight. With fewer than two players left the session
 * is over and the mode stops here.
 */
const ROUND_START_SOUND: string = 'Sound\\Interface\\ItemReceived.flac';

export class ArenaSetupState<T extends StateData> extends BaseState<T> {
	onEnterState() {
		const players = GlobalGameData.matchPlayers.filter((p) => !p.status.isEliminated());
		const sessionBoard = ScoreboardManager.getInstance().getSessionBoard();

		if (players.length < 2) {
			if (sessionBoard) {
				sessionBoard.setTitle('Arena - Final Score');
				sessionBoard.updateFull();
			}
			ScoreboardManager.getInstance().showSessionBoard();
			GlobalMessage(`${HexColors.TANGERINE}The arena session is over|r - a round needs two players.`, 'Sound\\Interface\\ItemReceived.flac', 10);
			return;
		}

		const nameManager = NameManager.getInstance();

		players.forEach((activePlayer) => {
			const p = activePlayer.getPlayer();
			// Like promode: lobby colors and account names stay the same for the whole session
			nameManager.setColor(p, nameManager.getLobbyColor(p));
			nameManager.setName(p, 'acct');
			activePlayer.trackedData.bonus.disable();
			activePlayer.trackedData.bonus.hideUI();
		});

		FogManager.getInstance().turnFogOff();

		const arenaManager = ArenaManager.getInstance();
		const deciders = arenaManager.getDeciders();

		if (deciders) {
			// A tied leader left before the deciding round - the remaining one wins, or the best player left if none remains
			const present = players.filter((p) => deciders.indexOf(p.getPlayer()) >= 0);

			if (present.length < 2) {
				announceArenaChampion(present.length == 1 ? present[0] : getArenaLeaders(players)[0]);
				return;
			}
		}

		const round = arenaManager.startRound(players);

		if (round.matches.length == 0) {
			GlobalMessage(`${HexColors.RED}The arena could not be set up.|r`);
			return;
		}

		if (sessionBoard) {
			sessionBoard.clearLiveKillsDeaths();
			sessionBoard.setTitle(arenaManager.getSessionTitle());
			sessionBoard.updateFull();
		}

		setTickUI(`${ARENA_ROUND_DURATION}`, `${round.number}`);

		// One message per player with the round, their fight and its army - a separate global message would overlap it
		const header = round.decider ? `${HexColors.TANGERINE}Deciding round|r` : `${HexColors.TANGERINE}Round ${round.number}|r`;
		const waitingText = round.decider ? 'You watch the deciding round.' : 'You wait this round and move an arena up afterwards.';

		round.matches.forEach((match) => {
			match.cities.forEach((city, p) => {
				const opponent = match.players.find((other) => other.getPlayer() != p);

				PanCameraToTimedForPlayer(p, city.barrack.defaultX, city.barrack.defaultY, 0);
				LocalMessage(
					p,
					`${header}\n\n${ArenaManager.arenaLabel(match.slot)} (${match.arena.country}) vs ${nameManager.getDisplayName(opponent.getPlayer())}\n\nArmy: ${arenaManager.describeArmy(match.army)}`,
					ROUND_START_SOUND,
					5
				);
			});
		});

		// Players without a fight and observers watch the top arena
		const [topX, topY] = this.getMatchCenter(round.matches[0].cities);

		round.waiting.forEach((activePlayer) => {
			PanCameraToTimedForPlayer(activePlayer.getPlayer(), topX, topY, 0);
			LocalMessage(activePlayer.getPlayer(), `${header}\n\n${waitingText}`, ROUND_START_SOUND, 5);
		});

		PlayerManager.getInstance().observers.forEach((_, observer) => {
			PanCameraToTimedForPlayer(observer, topX, topY, 0);
			LocalMessage(observer, header, ROUND_START_SOUND, 5);
		});

		this.nextState(this.stateData);
	}

	private getMatchCenter(cities: Map<player, City>): [number, number] {
		let x = 0;
		let y = 0;

		cities.forEach((city) => {
			x += city.barrack.defaultX;
			y += city.barrack.defaultY;
		});

		return [x / cities.size, y / cities.size];
	}
}
