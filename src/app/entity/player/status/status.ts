import { GamePlayer } from '../game-player';
import { PLAYER_STATUS } from './status-enum';
import { AliveStrategy } from './strategies/alive-strategy';
import { DeadStrategy } from './strategies/dead-strategy';
import { LeftStrategy } from './strategies/left-strategy';
import { NomadStrategy } from './strategies/nomad-strategy';
import { StatusStrategy } from './strategies/status-strategy';
import { STFUStrategy } from './strategies/stfu-strategy';

export class Status {
	private player: GamePlayer;
	private status: string;
	private statusDuration: number;

	private static readonly STRATEGY_MAP: Map<string, StatusStrategy> = new Map([
		[PLAYER_STATUS.ALIVE, new AliveStrategy()],
		[PLAYER_STATUS.NOMAD, new NomadStrategy()],
		[PLAYER_STATUS.DEAD, new DeadStrategy()],
		[PLAYER_STATUS.LEFT, new LeftStrategy()],
		[PLAYER_STATUS.STFU, new STFUStrategy()],
	]);

	constructor(player: GamePlayer) {
		this.player = player;
		this.statusDuration = -1;
	}

	public set(status: string) {
		const strategy = Status.STRATEGY_MAP.get(status);

		if (strategy) {
			strategy.run(this.player);
		} else {
			print('Unknown player status:', status);
		}
	}

	public isAlive(): boolean {
		return this.status == PLAYER_STATUS.ALIVE;
	}

	public isDead(): boolean {
		return this.status == PLAYER_STATUS.DEAD;
	}

	public isLeft(): boolean {
		return this.status == PLAYER_STATUS.LEFT;
	}

	public isNomad(): boolean {
		return this.status == PLAYER_STATUS.NOMAD;
	}

	public isSTFU(): boolean {
		return this.status == PLAYER_STATUS.STFU;
	}

	public getStatus(): string {
		return this.status;
	}

	public setStatus(value: string) {
		this.status = value;
	}

	public getStatusDuration(): number {
		return this.statusDuration;
	}

	public setStatusDuration(value: number) {
		this.statusDuration = value;
	}
}
