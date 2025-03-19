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
import { PlayerManager } from 'src/app/player/player-manager';
import { debugPrint } from 'src/app/utils/debug-print';

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
		debugPrint('onSwapGuard');
		// city.onCast(targetedUnit, triggerPlayer);
		// Not a capital then swap
		if (!city.isCapital()) {
			debugPrint('Not a capital then swap');
			city.onCast(targetedUnit);
			return;
		}

		// If same owner then swap
		if (GetOwningPlayer(targetedUnit) === city.getOwner()) {
			debugPrint('If same owner then swap');
			city.onCast(targetedUnit);
			return;
		}

		// If enemy team then don't swap
		const shareTeam = TeamManager.getInstance().getTeamFromPlayer(GetOwningPlayer(targetedUnit)).playerIsInTeam(city.getOwner());
		if (!shareTeam) {
			debugPrint("If enemy team then don't swap");
			LocalMessage(triggerPlayer, `You can not swap the guard with an enemy unit!`, 'Sound\\Interface\\Error.flac');
			return;
		}

		// If allied team keep then swap
		const unitTypeId = GetUnitTypeId(city.barrack.unit);
		if (unitTypeId == UNIT_ID.CONQUERED_CAPITAL) {
			debugPrint('If is keep then swap');
			city.onCast(targetedUnit);
			return;
		}

		// Owner of capital is alive
		const isActive = PlayerManager.getInstance().getPlayerStatus(city.getOwner()).isActive();
		if (unitTypeId == UNIT_ID.CAPITAL && !isActive) {
			debugPrint('Owner of capital is alive');
			city.onCast(targetedUnit);
			return;
		} else {
			debugPrint('You can not swap the guard of an allied capital!');
			LocalMessage(triggerPlayer, `You can not swap the guard of an allied capital!`, 'Sound\\Interface\\Error.flac');
			return;
		}
	}
}
