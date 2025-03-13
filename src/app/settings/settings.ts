export interface Settings {
	GameType: GameType;
	Fog: Fog;
	Overtime: Overtime;
	Diplomacy: Diplomacy;
	PlayersPerTeam: number;
}

//Enums need to correspond with the popup frames menuitems order in the risk.fdf file.
export enum GameType {
	Standard = 0,
	Promode = 1,
	Capitals = 2,
	Tournament = 3,
}

export enum Overtime {
	Turn30 = 0,
	Turn60 = 1,
	Turn120 = 2,
	Off = 3,
}

export enum Fog {
	Off = 0,
	On = 1,
	Night = 2,
}

export enum Diplomacy {
	FFA = 0,
	DraftTeams = 1,
	RandomTeams = 2,
}

//This enum does not correspond to anything in the fdf files and can be freely changed. It is here to avoid magic numbers.
export enum TeamSize {
	Two = 2,
	Three = 3,
	Four = 4,
	Five = 5,
	Six = 6,
}
