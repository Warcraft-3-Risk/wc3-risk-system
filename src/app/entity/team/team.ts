import { KillsDeaths } from '../data/kills-death';
import { EntityData } from '../entity-data';
import { GameEntity } from '../game-entity';
import { GamePlayer } from '../player/game-player';
import { TeamData } from './team-data';

export class Team implements GameEntity<KillsDeaths> {
	private name: string;
	private number: number;
	private data: TeamData;
	private members: Set<GamePlayer>;

	constructor() {
		this.members = new Set<GamePlayer>();
	}

	public reset(): void {
		this.data.reset();
	}

	public getData(): EntityData<KillsDeaths> {
		throw new Error('Method not implemented.');
	}
	public onKill(victim: player, unit: unit): void {
		throw new Error('Method not implemented.');
	}
	public onDeath(killer: player, unit: unit): void {
		throw new Error('Method not implemented.');
	}

	public addMember(entity: GamePlayer): void {
		this.members.add(entity);
		// TODO Update team-wide data as needed
	}

	public removeMember(entity: GamePlayer): void {
		this.members.delete(entity);
		// TODO Update team-wide data as needed
	}

	public getTeamMembers(): Set<GamePlayer> {
		return this.members;
	}
}
