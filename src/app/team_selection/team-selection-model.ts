import { Resetable } from '../interfaces/resettable';

export interface PlayerData {
	benchSlotIndex: number;
	teamNumber: number;
	slotIndex: number;
}

export interface TeamData {
	players: Set<player>;
	name: string;
	number: number;
	color: string | null;
	captain: player | null;
}

export interface TeamSlotData {
	frame: framehandle;
	teamNumber: number;
	slotIndex: number;
	isCaptainSlot: boolean;
	occupant: player | null;
}

export class TeamSelectionModel implements Resetable {
	private playerData: Map<player, PlayerData>;
	private teamData: Map<number, TeamData>;
	private teamSlotData: Map<number, TeamSlotData>;
	private teamSlotFrameMap: Map<framehandle, TeamSlotData>;
	private teamSlotIndex: number;

	public constructor() {
		this.playerData = new Map();
		this.teamData = new Map();
		this.teamSlotData = new Map();
		this.teamSlotFrameMap = new Map();
		this.teamSlotIndex = 0;
	}

	public reset(): void {
		this.playerData.clear();

		this.teamData.forEach((data) => {
			data.players.clear();
			data.name = `Team ${data.number}`;
			data.color = null;
			data.captain = null;
		});

		this.teamSlotData.forEach((data) => {
			data.occupant = null;
		});
	}

	public registerPlayer(player: player, benchIndex: number): void {
		this.playerData.set(player, { benchSlotIndex: benchIndex, teamNumber: -1, slotIndex: -1 });
	}

	public registerTeam(teamNumber: number): void {
		this.teamData.set(teamNumber, {
			players: new Set(),
			name: `Team ${teamNumber}`,
			number: teamNumber,
			color: null,
			captain: null,
		});
	}

	public generateTeamSlotIndex(): number {
		const index = this.teamSlotIndex;

		this.teamSlotIndex++;

		return index;
	}

	public registerTeamSlot(index: number, frame: framehandle, teamNumber: number, isCaptainSlot: boolean): void {
		const slotData: TeamSlotData = { frame, teamNumber, slotIndex: index, isCaptainSlot, occupant: null };

		this.teamSlotData.set(index, slotData);
		this.teamSlotFrameMap.set(frame, slotData);
	}

	public addPlayerToTeam(player: player, teamNumber: number, slotNumber: number, isCaptain: boolean): void {
		const playerData = this.playerData.get(player);

		playerData.teamNumber = teamNumber;
		playerData.slotIndex = slotNumber;

		const teamData = this.teamData.get(teamNumber);

		teamData.players.add(player);
		if (isCaptain) teamData.captain = player;

		const slotData = this.teamSlotData.get(slotNumber);

		slotData.occupant = player;
	}

	public removePlayerFromTeam(player: player, teamNumber: number): void {
		const playerData = this.playerData.get(player);
		const slotData = this.teamSlotData.get(playerData.slotIndex);

		slotData.occupant = null;
		playerData.teamNumber = -1;
		playerData.slotIndex = -1;

		const teamData = this.teamData.get(teamNumber);

		teamData.players.delete(player);
		if (teamData.captain === player) teamData.captain = null;
	}

	public getPlayerData(): Map<player, PlayerData> {
		return this.playerData;
	}

	public getPlayerDataForPlayer(player: player): PlayerData {
		return this.playerData.get(player);
	}

	public getTeamSlotData(): Map<number, TeamSlotData> {
		return this.teamSlotData;
	}

	public getTeamSlotDataForIndex(index: number): TeamSlotData {
		return this.teamSlotData.get(index);
	}

	public getTeamSlotForFrame(frame: framehandle): TeamSlotData {
		return this.teamSlotFrameMap.get(frame);
	}

	public getTeamData(): Map<number, TeamData> {
		return this.teamData;
	}

	public getTeamDataForTeam(teamNumber: number): TeamData {
		return this.teamData.get(teamNumber);
	}
}
