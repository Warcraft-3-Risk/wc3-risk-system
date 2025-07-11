import { GlobalGameData } from '../../state/global-game-state';
import { NameManager } from 'src/app/managers/names/name-manager';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { BaseState } from '../state/base-state';
import { CAPITALS_SELECTION_PHASE } from 'src/configs/game-settings';
import { CountdownMessage, LocalMessage } from 'src/app/utils/messages';
import { NEUTRAL_HOSTILE, PlayGlobalSound } from 'src/app/utils/utils';
import { City } from 'src/app/city/city';
import { LandCity } from 'src/app/city/land-city';
import { CityToCountry } from 'src/app/country/country-map';
import { CapitalsData } from '../mode/capitals-mode';
import { debugPrint } from 'src/app/utils/debug-print';
import { FogManager } from 'src/app/managers/fog-manager';

export class CapitalsSelectionState extends BaseState<CapitalsData> {
	onEnterState() {
		this.run();
	}

	run(): void {
		FogManager.getInstance().turnFogOff();
		BlzEnableSelections(true, false);
		debugPrint('1. Capitals Selection');
		debugPrint('this.stateData is ' + this.stateData);
		// Initialize the player capital cities map with empty capitals
		this.stateData.capitals = new Map();
		this.stateData.playerCapitalSelections = new Map();

		debugPrint('2. Capitals Selection');
		GlobalGameData.matchPlayers.forEach((player) => {
			this.stateData.playerCapitalSelections.set(player.getPlayer(), undefined);
		});
		debugPrint('3. Capitals Selection');
		try {
			PlayGlobalSound('Sound\\Interface\\ArrangedTeamInvitation.flac');
			const startDelayTimer: timer = CreateTimer();
			let duration: number = CAPITALS_SELECTION_PHASE;

			// Prepare the countdown message
			CountdownMessage(`Left click on a city to\nchoose your capital\n\nSelection closes in\n${duration}`);
			BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), true);

			debugPrint('6. Capitals Selection');
			TimerStart(startDelayTimer, 1, true, () => {
				// Clears capital selection and resets selected city if player is eliminated
				this.resetCapitalsForEliminatedPlayers();
				CountdownMessage(`Left click on a city to\nchoose your capital\n\nSelection closes in\n${duration}`);

				if (duration == 3) {
					BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), true);
				}
				if (duration <= 0) {
					PauseTimer(startDelayTimer);
					DestroyTimer(startDelayTimer);
					BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), false);
					EnableSelect(true, true);
					EnableDragSelect(true, true);
					PlayGlobalSound('Sound\\Interface\\Hint.flac');

					super.nextState(this.stateData);
				}
				duration--;
			});
		} catch (error) {
			print('Error in Metagame ' + error);
		}
	}

	resetCapitalsForEliminatedPlayers(): void {
		const playersEliminated = GlobalGameData.matchPlayers.filter((player) => player.status.isEliminated());
		if (playersEliminated.length === 0) {
			debugPrint('No players are eliminated, skipping capital reset.');
			return;
		}

		playersEliminated.forEach((player) => {
			const city = this.stateData.playerCapitalSelections.get(player.getPlayer());
			city?.reset();

			this.stateData.playerCapitalSelections.delete(player.getPlayer());
			debugPrint(`Player ${NameManager.getInstance().getDisplayName(player.getPlayer())} is eliminated.`);
		});
	}

	// Remove player from the capital selection phase if they leave the game
	onPlayerLeft(player: ActivePlayer): void {
		debugPrint(`Player ${NameManager.getInstance().getDisplayName(player.getPlayer())} has left the game during capital selection.`);
		const city = this.stateData.playerCapitalSelections.get(player.getPlayer());
		city?.reset();
		this.stateData.playerCapitalSelections.delete(player.getPlayer());
		super.onPlayerLeft(player);
	}

	onCitySelected(city: City, player: player): void {
		if (city.getOwner() === player) return;

		if (city.isPort()) {
			LocalMessage(player, `Capital can not be a port!\nPlease choose another city as your capital.`, 'Sound\\Interface\\Error.flac');
			return;
		}

		if (city.getOwner() != NEUTRAL_HOSTILE) {
			LocalMessage(
				player,
				`${NameManager.getInstance().getDisplayName(city.getOwner())} has already selected this city!\nPlease choose another city as your capital.`,
				'Sound\\Interface\\Error.flac'
			);
			return;
		}

		const country = CityToCountry.get(city);
		const cities = country.getCities();
		if (cities.length <= 1) {
			LocalMessage(
				player,
				`Only countries with 2 or cities can be chosen.\nPlease choose another city as your capital.`,
				'Sound\\Interface\\Error.flac'
			);
			return;
		}

		if (cities.find((x) => x.getOwner() != NEUTRAL_HOSTILE && x.getOwner() != player) !== undefined) {
			LocalMessage(
				player,
				`${NameManager.getInstance().getDisplayName(city.getOwner())} has already selected this city!\nPlease choose another city as your capital.`,
				'Sound\\Interface\\Error.flac'
			);
			return;
		}

		const capital = this.stateData.playerCapitalSelections.get(player);

		if (capital instanceof LandCity) {
			capital.reset();
		}

		city.changeOwner(player);
		SetUnitOwner(city.guard.unit, player, true);

		this.stateData.playerCapitalSelections.set(player, city);

		super.onCitySelected(city, player);
	}
}
