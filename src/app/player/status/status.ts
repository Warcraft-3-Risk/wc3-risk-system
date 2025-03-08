import { ActivePlayer } from '../types/active-player';
import { PLAYER_STATUS } from './status-enum';
import { AliveStrategy } from './strategies/alive-strategy';
import { DeadStrategy } from './strategies/dead-strategy';
import { LeftStrategy } from './strategies/left-strategy';
import { NomadStrategy } from './strategies/nomad-strategy';
import { StatusStrategy } from './strategies/status-strategy';
import { STFUStrategy } from './strategies/stfu-strategy';

export class Status {
	private player: ActivePlayer;
	private _status: string;
	private _statusDuration: number;

	private static readonly STRATEGY_MAP: Map<string, StatusStrategy> = new Map([
		[PLAYER_STATUS.ALIVE, new AliveStrategy()],
		[PLAYER_STATUS.NOMAD, new NomadStrategy()],
		[PLAYER_STATUS.DEAD, new DeadStrategy()],
		[PLAYER_STATUS.LEFT, new LeftStrategy()],
		[PLAYER_STATUS.STFU, new STFUStrategy()],
	]);

	constructor(player: ActivePlayer) {
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

	// Checks if the player is still in the match as either alive or nomad.
	public isActive(): boolean {
		return this._status == PLAYER_STATUS.ALIVE || this._status == PLAYER_STATUS.NOMAD;
	}

	// Checks if the player is eliminated from the match as either dead, left or stfu'ed.
	public isEliminated(): boolean {
		return this._status == PLAYER_STATUS.DEAD || this._status == PLAYER_STATUS.LEFT || this._status == PLAYER_STATUS.STFU;
	}

	// Checks if the player is still in the match.
	public isAlive(): boolean {
		return this._status == PLAYER_STATUS.ALIVE;
	}

	// Checks if the player is eliminated from the match or has forfeited.
	public isDead(): boolean {
		return this._status == PLAYER_STATUS.DEAD;
	}

	// Checks if player status is disconnected from match.
	public isLeft(): boolean {
		return this._status == PLAYER_STATUS.LEFT;
	}

	// Checks if the player is without bases.
	public isNomad(): boolean {
		return this._status == PLAYER_STATUS.NOMAD;
	}

	// Checks if the eliminated player is STFU'ed
	public isSTFU(): boolean {
		return this._status == PLAYER_STATUS.STFU;
	}

	public get status(): string {
		return this._status;
	}

	public set status(value: string) {
		this._status = value;
	}

	public get statusDuration(): number {
		return this._statusDuration;
	}

	public set statusDuration(value: number) {
		this._statusDuration = value;
	}
}
