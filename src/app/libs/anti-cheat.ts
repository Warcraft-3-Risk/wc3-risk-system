import { File } from 'w3ts';
import { NameManager } from '../managers/names/name-manager';

type Multis = {
	player: player;
	name: string;
	multiName: string;
};

export class AntiCheat {
	private static multis: Multis[] = [];

	public static checkMultiAccounts(onComplete: () => void) {
		const path: string = 'check.pld';
		const nameManager: NameManager = NameManager.getInstance();

		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const player: player = Player(i);

			if (IsPlayerObserver(player)) continue;

			if (GetPlayerController(player) == MAP_CONTROL_USER && GetPlayerSlotState(player) == PLAYER_SLOT_STATE_PLAYING) {
				const name: string = nameManager.getBtag(player);

				if (GetLocalPlayer() == player) {
					File.write(path, name);
				}
			}
		}

		const waitTimer: timer = CreateTimer();

		TimerStart(waitTimer, 1, false, () => {
			for (let i = 0; i < bj_MAX_PLAYERS; i++) {
				const player: player = Player(i);

				if (IsPlayerObserver(player)) continue;

				if (GetPlayerController(player) == MAP_CONTROL_USER && GetPlayerSlotState(player) == PLAYER_SLOT_STATE_PLAYING) {
					const name: string = nameManager.getBtag(player);
					let contents: string = '';

					if (GetLocalPlayer() == player) {
						contents = File.read(path);
					}

					if (contents != name) {
						AntiCheat.multis.push({
							player: player,
							name: name,
							multiName: contents,
						});
					}
				}
			}

			AntiCheat.processMultis();
			PauseTimer(waitTimer);
			DestroyTimer(waitTimer);
			onComplete();
		});
	}

	private static processMultis() {
		AntiCheat.multis.forEach((player) => {
			try {
				const multiAcct: player = NameManager.getInstance().getPlayerFromBtag(player.multiName);

				if (multiAcct) {
					AntiCheat.removePlayer(player.player);
					AntiCheat.removePlayer(multiAcct);
				}
			} catch (error) {
				print(error);
			}
		});
	}

	private static removePlayer(player: player) {
		RemovePlayer(player, PLAYER_GAME_RESULT_DEFEAT);

		if (GetLocalPlayer() == player) {
			EndGame(false);
		}
	}
}
