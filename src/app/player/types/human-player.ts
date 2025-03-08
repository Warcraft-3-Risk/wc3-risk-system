import { ActivePlayer } from './active-player';

export class HumanPlayer extends ActivePlayer {
	constructor(player: player) {
		super(player);
	}

	onKill(victom: player, unit: unit): void {
		const killer: player = this.getPlayer();

		if (!this.status.isAlive() && !this.status.isNomad()) return;
		if (victom == killer) return;
		if (IsPlayerAlly(victom, killer)) return;

		const val: number = GetUnitPointValue(unit);
		const kdData = this.trackedData.killsDeaths;

		kdData.get(killer).killValue += val;
		kdData.get(victom).killValue += val;
		kdData.get(`${GetUnitTypeId(unit)}`).killValue += val;
		kdData.get(killer).kills++;
		kdData.get(victom).kills++;
		kdData.get(`${GetUnitTypeId(unit)}`).kills++;

		this.giveGold(this.trackedData.bounty.add(val));
		this.giveGold(this.trackedData.bonus.add(val));
	}

	onDeath(killer: player, unit: unit): void {
		this.trackedData.units.delete(unit);

		if (!this.status.isAlive() && !this.status.isNomad()) return;

		const victom: player = this.getPlayer();
		if (victom == killer) return;
		if (IsPlayerAlly(victom, killer)) return;

		const val: number = GetUnitPointValue(unit);
		const kdData = this.trackedData.killsDeaths;

		kdData.get(killer).deathValue += val;
		kdData.get(victom).deathValue += val;
		kdData.get(`${GetUnitTypeId(unit)}`).deathValue += val;

		kdData.get(killer).deaths++;
		kdData.get(victom).deaths++;
		kdData.get(`${GetUnitTypeId(unit)}`).deaths++;
	}
}
