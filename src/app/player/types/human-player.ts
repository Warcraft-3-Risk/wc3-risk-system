import { AnnounceOnUnitObserverOnlyTintedByPlayer } from 'src/app/game/announcer/announce';
import { ActivePlayer } from './active-player';
import { debugPrint } from '../../utils/debug-print';
import { TURN_DURATION_IN_SECONDS } from '../../../configs/game-settings';
import { NameManager } from 'src/app/managers/names/name-manager';

export class HumanPlayer extends ActivePlayer {
	constructor(player: player) {
		super(player);
	}

	onKill(victim: player, unit: unit): void {
		const killer: player = this.getPlayer();

		debugPrint(`1.1`);
		if (!this.status.isAlive() && !this.status.isNomad()) return;
		debugPrint(`1.2`);
		if (victim == killer) {
			this.trackedData.denies++;
			return;
		}
		debugPrint(`1.3 ${NameManager.getInstance().getDisplayName(victim)} ${NameManager.getInstance().getDisplayName(killer)}`);
		if (IsPlayerAlly(victim, killer)) return;
		const val: number = GetUnitPointValue(unit);
		const kdData = this.trackedData.killsDeaths;
		debugPrint(`1.4 ${kdData.get(killer).killValue}`);
		debugPrint(`1.5 ${NameManager.getInstance().getDisplayName(killer)}`);
		debugPrint(`Value: ${val}, ${kdData.has(killer) ? 'true' : 'false'}`);
		kdData.get(killer).killValue += val; /////////////// CODE BREAKS HERE !!!!!!!!!!
		debugPrint(`1.6 ${NameManager.getInstance().getDisplayName(victim)}`);
		kdData.get(victim).killValue += val;
		debugPrint(`1.7`);
		kdData.get(`${GetUnitTypeId(unit)}`).killValue += val;
		debugPrint(`1.8`);
		kdData.get(killer).kills++;
		debugPrint(`1.9`);
		kdData.get(victim).kills++;
		debugPrint(`1.10`);
		kdData.get(`${GetUnitTypeId(unit)}`).kills++;
		debugPrint(`1.11`);
		const bounty = this.trackedData.bounty.add(val);

		if (bounty > 0) {
			AnnounceOnUnitObserverOnlyTintedByPlayer(`+${bounty}`, unit, 2.0, 3.0, killer, 170, 20);
		}
		debugPrint(`7`);
		this.giveGold(bounty);
		this.giveGold(this.trackedData.bonus.add(val));
		debugPrint(`8`);
		if (GetPlayerController(victim) === MAP_CONTROL_USER && GetPlayerController(killer) === MAP_CONTROL_USER) {
			const minutes: number = parseInt(BlzFrameGetText(BlzGetFrameByName('ResourceBarSupplyText', 0)));
			const seconds: number = TURN_DURATION_IN_SECONDS - parseInt(BlzFrameGetText(BlzGetFrameByName('ResourceBarUpkeepText', 0)));

			this.trackedData.lastCombat = minutes * 60 + seconds;
		}
		debugPrint(`9`);
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
