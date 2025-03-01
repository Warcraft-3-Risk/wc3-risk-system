import { GuardPreferences } from 'src/app/entity/player/guard-preferences';
import { GameEntity } from '../game-entity';
import { PlayerData } from './player-data';
import { Status } from './status/status';
import { PLAYER_STATUS } from './status/status-enum';
import { NameManager } from 'src/app/managers/names/name-manager';
import { Team } from '../team/team';
import { EntityID } from '../entity-id';
import { KillsDeaths } from '../data/kills-death';

export class GamePlayer implements GameEntity<Map<EntityID, KillsDeaths>> {
	private player: player;
	private status: Status;
	private guardPreferences: GuardPreferences;
	private data: PlayerData;
	private team: Team | null;

	constructor(player: player) {
		this.player = player;
		this.status = new Status(this);
		this.guardPreferences = {
			health: false,
			value: false,
		};
		this.data = new PlayerData(player);
		this.team = null;
	}

	public reset(): void {
		this.data.reset();
		this.status.set(PLAYER_STATUS.ALIVE);
		this.guardPreferences = {
			health: false,
			value: false,
		};
	}

	public getData(): PlayerData {
		return this.data;
	}

	public onKill(victim: player, unit: unit): void {
		const killer: player = this.getPlayer();

		if (!this.status.isAlive() && !this.status.isNomad()) return;
		if (victim == killer) return;
		if (IsPlayerAlly(victim, killer)) return;

		const val: number = GetUnitPointValue(unit);
		const kdData = this.data.getKillsDeaths();

		kdData.get(killer).killValue += val;
		kdData.get(victim).killValue += val;
		kdData.get(`${GetUnitTypeId(unit)}`).killValue += val;
		kdData.get(killer).kills++;
		kdData.get(victim).kills++;
		kdData.get(`${GetUnitTypeId(unit)}`).kills++;

		this.giveGold(this.data.getBounty().add(val));
		this.giveGold(this.data.getBonus().add(val));
	}

	public onDeath(killer: player, unit: unit): void {
		this.data.getUnits().delete(unit);

		if (!this.status.isAlive() && !this.status.isNomad()) return;

		const victim: player = this.getPlayer();

		if (victim == killer) return;
		if (IsPlayerAlly(victim, killer)) return;

		const val: number = GetUnitPointValue(unit);
		const kdData = this.data.getKillsDeaths();

		kdData.get(killer).deathValue += val;
		kdData.get(victim).deathValue += val;
		kdData.get(`${GetUnitTypeId(unit)}`).deathValue += val;
		kdData.get(killer).deaths++;
		kdData.get(victim).deaths++;
		kdData.get(`${GetUnitTypeId(unit)}`).deaths++;
	}

	public setEndData() {
		const handle: player = this.getPlayer();

		this.data.getIncome().end = this.data.getIncome().income;
		this.data.getCities().end = this.data.getCities().cities.length;
		this.data.setTurnDied(S2I(BlzFrameGetText(BlzGetFrameByName('ResourceBarSupplyText', 0))));
		this.data.getGold().end = GetPlayerState(handle, PLAYER_STATE_RESOURCE_GOLD);

		if (handle == GetLocalPlayer()) {
			EnableSelect(false, false);
			EnableDragSelect(false, false);
		}

		SetPlayerState(handle, PLAYER_STATE_RESOURCE_GOLD, 0);
		NameManager.getInstance().setName(handle, 'btag');
	}

	public giveGold(val?: number): void {
		if (!val) val = this.data.getIncome().income;

		SetPlayerState(this.player, PLAYER_STATE_RESOURCE_GOLD, GetPlayerState(this.player, PLAYER_STATE_RESOURCE_GOLD) + val);

		if (val >= 1) this.data.getGold().earned += val;

		const goldAmount: number = GetPlayerState(this.player, PLAYER_STATE_RESOURCE_GOLD);

		if (goldAmount > this.data.getGold().max) {
			this.data.getGold().max = goldAmount;
		}
	}

	public getPlayer(): player {
		return this.player;
	}

	public getStatus(): Status {
		return this.status;
	}

	public getGuardPreferences(): GuardPreferences {
		return this.guardPreferences;
	}

	public setTeam(team: Team): void {
		this.team = team;
		team.addMember(this);
	}

	public getTeam(): Team | null {
		return this.team;
	}
}
