
export class Alliance {
	private readonly _number: number;
	private readonly _players: player[];
	private _income: number;
	private _kills: number;
	private _deaths: number;
	private _cities: number;

	public constructor(teamNum: number, players?: player[]) {
		this._number = teamNum;
		this._players = [];

		if (players) {
			players.forEach((player) => {
				this._players.push(player);
			});
		}
	}

	/**
	 * Get the team number for this alliance
	 */
	public get number(): number {
		return this._number;
	}

	/**
	 * Get the players in this team
	 */
	public get players(): player[] {
		return this._players;
	}

	/**
	 * Adds a player to this alliance
	 * @param player Player to be added to this alliance.
	 */
	public add(player: player): void {
		this._players.forEach((playerB) => {
			this.setAllianceState(player, playerB, true);
		});

		this._players.push(player);
	}

	/**
	 * Get the size of the alliance. The size is based on the internal array length.
	 * @returns the number of players in this alliance
	 */
	public size(): number {
		return this._players.length;
	}

	public disband(): void {
		for (let i = 0; i < this._players.length; i++) {
			const playerA: player = this._players[i];

			SetPlayerTeam(playerA, GetPlayerId(playerA));

			for (let j = 0; j < bj_MAX_PLAYERS; j++) {
				this.setAllianceState(playerA, Player(j), false);
			}
		}
	}

	/**
	 *
	 * @param playerA player to ally playerB
	 * @param playerB player to ally playerA
	 * @param bool true will set as allies, false will set as enemies
	 */
	private setAllianceState(playerA: player, playerB: player, bool: boolean, shared?: boolean) {
		SetPlayerAlliance(playerA, playerB, ALLIANCE_PASSIVE, bool);
		SetPlayerAlliance(playerA, playerB, ALLIANCE_HELP_REQUEST, bool);
		SetPlayerAlliance(playerA, playerB, ALLIANCE_HELP_RESPONSE, bool);
		SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_XP, bool);
		SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_SPELLS, bool);
		SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_VISION, bool);
		SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_CONTROL, bool);

		SetPlayerAlliance(playerB, playerA, ALLIANCE_PASSIVE, bool);
		SetPlayerAlliance(playerB, playerA, ALLIANCE_HELP_REQUEST, bool);
		SetPlayerAlliance(playerB, playerA, ALLIANCE_HELP_RESPONSE, bool);
		SetPlayerAlliance(playerB, playerA, ALLIANCE_SHARED_XP, bool);
		SetPlayerAlliance(playerB, playerA, ALLIANCE_SHARED_SPELLS, bool);
		SetPlayerAlliance(playerB, playerA, ALLIANCE_SHARED_VISION, bool);
		SetPlayerAlliance(playerB, playerA, ALLIANCE_SHARED_CONTROL, bool);

		if (shared) {
			SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_ADVANCED_CONTROL, bool);
			SetPlayerAlliance(playerB, playerA, ALLIANCE_SHARED_ADVANCED_CONTROL, bool);
		}
	}
}
