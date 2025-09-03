import { AnnounceOnUnitObserverOnlyTintedByPlayer } from 'src/app/game/announcer/announce';
import { ActivePlayer } from './active-player';
import { debugPrint } from '../../utils/debug-print';
import { TURN_DURATION_IN_SECONDS } from '../../../configs/game-settings';

export class HumanPlayer extends ActivePlayer {
	constructor(player: player) {
		super(player);
	}

	onKill(victim: player, unit: unit): void {
		const killer: player = this.getPlayer();

		if (!this.status.isAlive() && !this.status.isNomad()) return;

		if (victim == killer) {
			this.trackedData.denies++;
			return;
		}
		if (IsPlayerAlly(victim, killer)) return;

		const val: number = GetUnitPointValue(unit);
		const kdData = this.trackedData.killsDeaths;

		kdData.get(killer).killValue += val;
		kdData.get(victim).killValue += val;
		kdData.get(`${GetUnitTypeId(unit)}`).killValue += val;
		kdData.get(killer).kills++;
		kdData.get(victim).kills++;
		kdData.get(`${GetUnitTypeId(unit)}`).kills++;

		const bounty = this.trackedData.bounty.add(val);

		if (bounty > 0) {
			AnnounceOnUnitObserverOnlyTintedByPlayer(`+${bounty}`, unit, 2.0, 3.0, killer, 170, 20);
		}

		this.giveGold(bounty);
		this.giveGold(this.trackedData.bonus.add(val));

		if (GetPlayerController(victim) === MAP_CONTROL_USER && GetPlayerController(killer) === MAP_CONTROL_USER) {
			const minutes: number = parseInt(BlzFrameGetText(BlzGetFrameByName('ResourceBarSupplyText', 0)));
			const seconds: number = TURN_DURATION_IN_SECONDS - parseInt(BlzFrameGetText(BlzGetFrameByName('ResourceBarUpkeepText', 0)));

			this.trackedData.lastCombat = minutes * 60 + seconds;
		}
	}

	onDeath(killer: player, unit: unit): void {
		this.trackedData.units.delete(unit);
		this.trackedData.lastUnitKilledBy = killer;

		if (!this.status.isAlive() && !this.status.isNomad()) return;

		const victim: player = this.getPlayer();
		if (victim == killer) return;
		if (IsPlayerAlly(victim, killer)) return;

		const val: number = GetUnitPointValue(unit);
		const kdData = this.trackedData.killsDeaths;

		kdData.get(killer).deathValue += val;
		kdData.get(victim).deathValue += val;
		kdData.get(`${GetUnitTypeId(unit)}`).deathValue += val;

		kdData.get(killer).deaths++;
		kdData.get(victim).deaths++;
		kdData.get(`${GetUnitTypeId(unit)}`).deaths++;

		if (GetPlayerController(victim) === MAP_CONTROL_USER && GetPlayerController(killer) === MAP_CONTROL_USER) {
			debugPrint('on death');
			const minutes: number = parseInt(BlzFrameGetText(BlzGetFrameByName('ResourceBarSupplyText', 0)));
			const seconds: number = TURN_DURATION_IN_SECONDS - parseInt(BlzFrameGetText(BlzGetFrameByName('ResourceBarUpkeepText', 0)));

			this.trackedData.lastCombat = minutes * 60 + seconds;
		}
	}
}
