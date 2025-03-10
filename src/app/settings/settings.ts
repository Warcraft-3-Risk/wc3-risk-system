export interface Settings {
	GameType: GameType;
	Fog: Fog;
	Overtime: Overtime;
	Diplomacy: Diplomacy;
	PlayersPerTeam: number;
}

//Enums need to correspond with the risk.fdf file order for the popup frames menuitems
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
