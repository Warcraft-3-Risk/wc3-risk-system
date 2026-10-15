import { AnnounceOnUnitObserverOnlyTintedByPlayer } from 'src/app/game/announcer/announce';
import { ActivePlayer } from './active-player';
import { TURN_DURATION_IN_SECONDS } from '../../../configs/game-settings';
import { GlobalGameData } from '../../game/state/global-game-state';

export class HumanPlayer extends ActivePlayer {
	constructor(player: player) {
		super(player);
	}

	// pointValue and unitTypeKey are computed once by the death event and shared by onKill/onDeath
	onKill(victim: player, unit: unit, isPlayerCombat: boolean, pointValue: number, unitTypeKey: string): void {
		const killer: player = this.getPlayer();

		if (!this.status.isAlive() && !this.status.isNomad()) return;
		if (victim == killer) {
			this.trackedData.denies++;
			return;
		}
		if (IsPlayerAlly(victim, killer)) return;
		const val: number = pointValue;
		const kdData = this.trackedData.killsDeaths;
		const killerKD = kdData.get(killer);
		const victimKD = kdData.get(victim);
		const unitTypeKD = kdData.get(unitTypeKey);
		killerKD.killValue += val;
		victimKD.killValue += val;
		unitTypeKD.killValue += val;
		killerKD.kills++;
		victimKD.kills++;
		unitTypeKD.kills++;
		const bounty = this.trackedData.bounty.add(val);

		if (bounty > 0) {
			AnnounceOnUnitObserverOnlyTintedByPlayer(`+${bounty}`, unit, 2.0, 3.0, killer, 170, 20);
		}
		this.giveGold(bounty);
		this.giveGold(this.trackedData.bonus.add(val));

		if (isPlayerCombat) {
			this.trackedData.lastCombat =
				GlobalGameData.turnCount * TURN_DURATION_IN_SECONDS + (TURN_DURATION_IN_SECONDS - GlobalGameData.tickCounter);
		}
	}

	onDeath(killer: player, unit: unit, isPlayerCombat: boolean, pointValue: number, unitTypeKey: string): void {
		this.trackedData.units.delete(unit);

		if(isPlayerCombat) {
			this.trackedData.lastUnitKilledBy = killer;
		}

		if (!this.status.isAlive() && !this.status.isNomad()) return;

		const victim: player = this.getPlayer();
		const val: number = pointValue;

		// For denies (killing own units), don't track as kill/death or add to fight bonus
		if (victim == killer) {
			return;
		}

		if (IsPlayerAlly(victim, killer)) return;

		const kdData = this.trackedData.killsDeaths;

		const killerKD = kdData.get(killer);
		const victimKD = kdData.get(victim);
		const unitTypeKD = kdData.get(unitTypeKey);

		killerKD.deathValue += val;
		victimKD.deathValue += val;
		unitTypeKD.deathValue += val;

		killerKD.deaths++;
		victimKD.deaths++;
		unitTypeKD.deaths++;

		if (isPlayerCombat) {
			this.trackedData.lastCombat =
				GlobalGameData.turnCount * TURN_DURATION_IN_SECONDS + (TURN_DURATION_IN_SECONDS - GlobalGameData.tickCounter);
		}
	}
}
