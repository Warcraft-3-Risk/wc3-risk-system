import { Resetable } from '../interfaces/resettable';

export interface PlayerData {
	benchSlot: number;
	teamNumber: number;
	teamSlot: number;
}

export interface TeamData {
	players: Set<player>;
	slots: boolean[];
	captain: player | null;
	color: string | null;
}

export class TeamSelectionModel implements Resetable {
	private playerData: Map<player, PlayerData> = new Map();
	private teams: Map<number, TeamData> = new Map();

	public constructor() {
		this.playerData = new Map<player, PlayerData>();
		this.teams = new Map<number, TeamData>();
	}

	public reset(): void {
		this.playerData.forEach((data) => {
			data.teamNumber = -1;
			data.teamSlot = -1;
		});

		this.teams.forEach((data) => {
			data.players.clear();
			data.slots = [];
			data.captain = null;
			data.color = null;
		});
	}

	public addPlayerToBench(player: player, benchIndex: number): void {
		this.playerData.set(player, { benchSlot: benchIndex, teamNumber: -1, teamSlot: -1 });
	}

	public setPlayerAsCaptain(player: player, team: number) {
		this.teams.get(team).captain = player;
	}

	public addPlayerToTeam(player: player, teamNumber: number): void {
		const team = this.teams.get(teamNumber);

		if (!team) return;

		const playerData = this.playerData.get(player);

		if (!playerData) return;

		let slot = team.slots.findIndex((s) => !s);

		if (slot === -1) {
			slot = team.slots.length;
		}

		team.slots[slot] = true;
		team.players.add(player);
		playerData.teamNumber = teamNumber;
		playerData.teamSlot = slot;
	}

	public removePlayerFromTeam(player: player): void {
		const playerData = this.playerData.get(player);

		if (!playerData || playerData.teamNumber === -1) return;

		const team = this.teams.get(playerData.teamNumber);

		if (!team) return;

		team.players.delete(player);
		team.slots[playerData.teamSlot] = false;
		playerData.teamNumber = -1;
		playerData.teamSlot = -1;
	}

	public getPlayerData(): Map<player, PlayerData> {
		return this.playerData;
	}
}
