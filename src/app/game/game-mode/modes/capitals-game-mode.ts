import { ActivePlayer } from 'src/app/player/types/active-player';
import { City } from 'src/app/city/city';
import { BaseGameMode } from '../base/base-game-mode';
import { NEUTRAL_HOSTILE, PlayGlobalSound } from 'src/app/utils/utils';
import { debugPrint } from 'src/app/utils/debug-print';
import { CountdownMessage, LocalMessage } from 'src/app/utils/messages';
import { LandCity } from 'src/app/city/land-city';
import { PLAYER_STATUS } from 'src/app/player/status/status-enum';
import { PlayerManager } from 'src/app/player/player-manager';
import { CapitalDistributionService } from '../../services/distribution-service/capital-distribution-service';
import { RegionToCity } from 'src/app/city/city-map';
import { CityToCountry } from 'src/app/country/country-map';
import { NameManager } from 'src/app/managers/names/name-manager';
import { Wait } from 'src/app/utils/wait';
import { UNIT_ID } from 'src/configs/unit-id';
import { CAPITALS_SELECTION_PHASE } from 'src/configs/game-settings';

export class CapitalsGameMode extends BaseGameMode {
	private capitalPickPhase: boolean = false;
	private playerCapitalSelections: Map<player, City>;
	private capitals: Map<player, City>;

	onEndTurn(turn: number): void {
		super.onEndTurn(turn);
	}

	onCityCapture(city: City, preOwner: ActivePlayer, owner: ActivePlayer): void {
		debugPrint('City captured');
		if (preOwner == owner) return;

		if (this.capitals.get(preOwner.getPlayer()) === city) {
			LocalMessage(
				preOwner.getPlayer(),
				`Your capital has been captured by ${NameManager.getInstance().getDisplayName(owner.getPlayer())}!\nYou have been eliminated!`,
				'Sound\\Interface\\Error.flac'
			);
			LocalMessage(
				owner.getPlayer(),
				`You have captured the capital of ${NameManager.getInstance().getDisplayName(preOwner.getPlayer())}!\nThey have been eliminated!`,
				'Sound\\Interface\\Victory.flac'
			);
			preOwner.status.set(PLAYER_STATUS.DEAD);

			debugPrint('Downgrading capital to city');

			if (GetUnitTypeId(city.barrack.unit) == UNIT_ID.CAPITAL) {
				IssueImmediateOrderById(city.barrack.unit, UNIT_ID.CONQUERED_CAPITAL);
			}

			debugPrint('Downgraded capital to city');

			// Reset the country spawn multiplier to 1
			CityToCountry.get(city).getSpawn().setMultiplier(1);
		}

		super.onCityCapture(city, preOwner, owner);
	}

	onCitySelected(city: City, player: player): void {
		if (!this.capitalPickPhase) return;
		if (city.getOwner() === player) return;

		if (city.isPort()) {
			LocalMessage(player, `Capital can not be a port!\nPlease choose another city for your capital.`, 'Sound\\Interface\\Error.flac');
			return;
		}

		if (city.getOwner() != NEUTRAL_HOSTILE) {
			LocalMessage(
				player,
				`${NameManager.getInstance().getDisplayName(city.getOwner())} has already selected this city!\nPlease choose another city for your capital.`,
				'Sound\\Interface\\Error.flac'
			);
			return;
		}

		const country = CityToCountry.get(city);
		const cities = country.getCities();
		if (cities.length <= 1) {
			LocalMessage(
				player,
				`Only countries with 2 or cities can be chosen.\nPlease choose another city for your capital.`,
				'Sound\\Interface\\Error.flac'
			);
			return;
		}

		if (cities.find((x) => x.getOwner() != NEUTRAL_HOSTILE && x.getOwner() != player) !== undefined) {
			LocalMessage(
				player,
				`${NameManager.getInstance().getDisplayName(city.getOwner())} has already selected this city!\nPlease choose another city for your capital.`,
				'Sound\\Interface\\Error.flac'
			);
			return;
		}

		this.playerCapitalSelections.get(player)?.reset();

		(city as LandCity).setCapital();

		city.changeOwner(player);
		SetUnitOwner(city.guard.unit, player, true);

		this.playerCapitalSelections.set(player, city);

		super.onCitySelected(city, player);
	}

	async onStartMatch(): Promise<void> {
		FogEnable(false);
		BlzEnableSelections(true, false);

		debugPrint('Starting Capitals Game Mode');

		// Initialize the player capital cities map with empty capitals
		debugPrint('Resetting capitals');
		this.capitals?.forEach((city, _) => {
			if (city == null) return;

			const unitTypeId = GetUnitTypeId(city.barrack.unit);
			if (unitTypeId == UNIT_ID.CAPITAL || unitTypeId == UNIT_ID.CONQUERED_CAPITAL) {
				IssueImmediateOrderById(city.barrack.unit, UNIT_ID.CITY);
			}
		});

		await Wait.forSeconds(2);

		// Populating the player capital selections map with null values
		debugPrint('Populating player capital selections');
		this.playerCapitalSelections = new Map();
		const players: ActivePlayer[] = [...PlayerManager.getInstance().players.values()];
		players.forEach((player) => {
			debugPrint('Setting player capital selection to null');
			this.playerCapitalSelections.set(player.getPlayer(), null);
		});

		debugPrint('Starting capital pick phase');
		this.capitalPickPhase = true;

		try {
			PlayGlobalSound('Sound\\Interface\\ArrangedTeamInvitation.flac');
			const startDelayTimer: timer = CreateTimer();
			let duration: number = CAPITALS_SELECTION_PHASE;
			debugPrint('Starting capital pick countdown');

			// Prepare the countdown message
			CountdownMessage(`Choose Your Capital\n\nSelection ends in:\n${duration}`);
			BlzFrameSetVisible(BlzGetFrameByName('CountdownFrame', 0), true);

			TimerStart(startDelayTimer, 1, true, () => {
				CountdownMessage(`Choose Your Capital\n\nSelection ends in:\n${duration}`);
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
					this.capitalPickPhase = false;

					Wait.forSeconds(2).finally(() => {
						this.playerCapitalSelections.forEach((city, _) => {
							city?.reset();
						});
						super.onStartMatch();
					});
				}
				duration--;
			});
		} catch (error) {
			debugPrint('Error in Metagame ' + error);
			print('Error in Metagame ' + error);
		}
	}

	// // Ensure that all players without capitals get assigned a random capital city.
	override onDistributeBases(): void {
		debugPrint('Distributing capitals');
		const capitalDistroService = new CapitalDistributionService(this.playerCapitalSelections);
		capitalDistroService.runDistro(() => {
			RegionToCity.forEach((city) => {
				city.guard.reposition();
				//Prevent guards from moving and update unit counts
				IssueImmediateOrder(city.guard.unit, 'stop');

				if (GetOwningPlayer(city.guard.unit) != NEUTRAL_HOSTILE) {
					PlayerManager.getInstance().players.get(GetOwningPlayer(city.guard.unit)).trackedData.units.add(city.guard.unit);
				}

				SetUnitInvulnerable(city.guard.unit, false);
			});
		});

		// Use the capital distribution service to also get the randomly assigned player capital cities
		this.capitals = new Map(capitalDistroService.selectedPlayerCapitalCities);

		// Set the country spawn multiplier to 2 for all countries with capitals
		this.capitals.forEach((city, _) => {
			CityToCountry.get(city).getSpawn().setMultiplier(2);
		});

		this.capitals.forEach((city, player) => {
			PingMinimapLocForPlayer(player, city.barrack.location, 20);
		});

		debugPrint('Upgrading cities to capitals');
		this.capitals.forEach((city, player) => {
			debugPrint(`Upgrading city to capital for ${NameManager.getInstance().getDisplayName(player)}`);
			IssueImmediateOrderById(city.barrack.unit, UNIT_ID.CAPITAL);
		});
		debugPrint('Finished upgrading cities to capitals');
	}
}
