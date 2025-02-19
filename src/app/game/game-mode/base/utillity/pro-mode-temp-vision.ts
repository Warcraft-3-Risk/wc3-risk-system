import { CityToCountry } from 'src/app/country/country-map';
import { PlayerManager } from 'src/app/player/player-manager';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { SettingsContext } from 'src/app/settings/settings-context';
import { NEUTRAL_HOSTILE } from 'src/app/utils/utils';
import { Wait } from 'src/app/utils/wait';

//TODO Why is this functionality split into two functions? This is promode specific and will never be used elsewhere.
async function setTempVision(players: Map<player, ActivePlayer>): Promise<void> {
	const visionMap = new Map<unit, player[]>();

	DisplayTextToForce(bj_FORCE_ALL_PLAYERS, `Revealing blocks`);

	for (const activePlayer of players.values()) {
		const playerHandle: player = activePlayer.getPlayer();

		const allies: player[] = [];
		for (const otherPlayer of players.values()) {
			const otherPlayerHandle: player = otherPlayer.getPlayer();
			if (IsPlayerAlly(playerHandle, otherPlayerHandle)) {
				allies.push(otherPlayerHandle);
			}
		}

		activePlayer.trackedData.cities.cities.forEach((playerCity) => {
			const country = CityToCountry.get(playerCity);

			country.getCities().forEach((countryCity) => {
				const unit: unit = countryCity.cop;

				if (GetOwningPlayer(unit) !== NEUTRAL_HOSTILE) {
					UnitShareVision(unit, playerHandle, true);

					const playersWithVision = visionMap.get(unit) || [];

					playersWithVision.push(playerHandle);

					allies.forEach((ally) => {
						UnitShareVision(unit, ally, true);
						playersWithVision.push(ally);
					});

					visionMap.set(unit, playersWithVision);
				}
			});
		});
	}

	await Wait.forSeconds(4);

	for (const [unit, players] of visionMap.entries()) {
		players.forEach((playerHandle) => {
			UnitShareVision(unit, playerHandle, false);
		});
	}

	ClearTextMessages();
}

export async function setProModeTempVision(): Promise<void> {
	SettingsContext.getInstance().applyStrategy('Fog');
	if (SettingsContext.getInstance().isPromode()) {
		await setTempVision(PlayerManager.getInstance().players);
	}
}
