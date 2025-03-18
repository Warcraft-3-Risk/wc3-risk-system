import { NameManager } from 'src/app/managers/names/name-manager';
import { ActivePlayer } from 'src/app/player/types/active-player';
import { City } from 'src/app/city/city';
import { GameLoopState } from '../base-game-mode.ts/game-loop-state';
import { CapitalsData } from '../mode/capitals-mode';
import { CityToCountry } from 'src/app/country/country-map';
import { PLAYER_STATUS } from 'src/app/player/status/status-enum';
import { LocalMessage } from 'src/app/utils/messages';
import { UNIT_ID } from 'src/configs/unit-id';
import { TeamManager } from 'src/app/teams/team-manager';
import { UNIT_TYPE } from 'src/app/utils/unit-types';
import { PlayerManager } from 'src/app/player/player-manager';

export class CapitalsGameLoopState extends GameLoopState<CapitalsData> {
	onEnterState() {
		super.onEnterState();
	}

	onCityCapture(city: City, preOwner: ActivePlayer, owner: ActivePlayer): void {
		super.onCityCapture(city, preOwner, owner);
		if (preOwner == owner) return;

		if (this.stateData.capitals.get(preOwner.getPlayer()) === city) {
			LocalMessage(
				preOwner.getPlayer(),
				`Your capital has been captured by ${NameManager.getInstance().getDisplayName(owner.getPlayer())}!\nYou have been eliminated!`,
				'Sound\\Interface\\Error.flac'
			);

			const playerIsActive = preOwner.status.isActive();

			LocalMessage(
				owner.getPlayer(),
				`You have captured the capital of ${NameManager.getInstance().getDisplayName(preOwner.getPlayer())}!${playerIsActive ? '\nThey have been eliminated!' : ''}`,
				'Sound\\Interface\\Victory.flac'
			);

			if (preOwner.status.isActive()) {
				preOwner.status.set(PLAYER_STATUS.DEAD);
			}

			if (GetUnitTypeId(city.barrack.unit) == UNIT_ID.CAPITAL) {
				IssueImmediateOrderById(city.barrack.unit, UNIT_ID.CONQUERED_CAPITAL);
			}

			// Reset the country spawn multiplier to 1
			CityToCountry.get(city).getSpawn().setMultiplier(1);
		}

		super.onCityCapture(city, preOwner, owner);
	}

	override onSwapGuard(targetedUnit: unit, city: City, triggerPlayer: player): void {
		// Not a capital then swap
		if (!city.isCapital()) {
			city.onCast(targetedUnit);
			return;
		}

		// If same owner then swap
		if (GetOwningPlayer(targetedUnit) === city.getOwner()) {
			city.onCast(targetedUnit);
			return;
		}

		// If enemy team then don't swap
		const shareTeam = TeamManager.getInstance().getTeamFromPlayer(GetOwningPlayer(targetedUnit)).playerIsInTeam(city.getOwner());
		if (!shareTeam) {
			return;
		}

		// If is keep then swap
		const unitTypeId = GetUnitTypeId(city.barrack.unit);
		if (unitTypeId == UNIT_ID.CONQUERED_CAPITAL) {
			city.onCast(targetedUnit);
		}

		// Owner of capital is alive
		const isActive = PlayerManager.getInstance().getPlayerStatus(city.getOwner()).isActive();
		if (unitTypeId == UNIT_ID.CAPITAL && !isActive) {
			city.onCast(targetedUnit);
		} else {
			LocalMessage(
				triggerPlayer,
				`You can not swap guard with ${NameManager.getInstance().getDisplayName(city.getOwner())}'s capital!`,
				'Sound\\Interface\\Error.flac'
			);
		}
	}
}
