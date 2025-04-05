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
	public playerData: Map<player, PlayerData> = new Map();
	public teams: Map<number, TeamData> = new Map();

	public constructor() {
		this.playerData = new Map<player, PlayerData>();
		this.teams = new Map<number, TeamData>();
	}

	public reset(): void {
		throw new Error('Method not implemented.');
	}

	public addPlayerToBench(player: player, benchIndex: number): void {
		this.playerData.set(player, { benchSlot: benchIndex, teamNumber: -1, teamSlot: -1 });
	}

	public removePlayerFromTeam(player: player): void {
		const data = this.playerData.get(player);

		if (!data || data.teamNumber === -1) return;

		const team = this.teams.get(data.teamNumber);

		if (!team) return;

		team.players.delete(player);
		team.slots[data.teamSlot] = false;

		if (team.captain === player) {
			const next = [...team.players][0] ?? null;
			team.captain = next;
		}

		data.teamNumber = -1;
		data.teamSlot = -1;
	}
}
