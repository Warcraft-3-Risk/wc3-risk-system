import { HexColors } from '../utils/hex-colors';

export interface Settings {
	GameType: GameType;
	Fog: Fog;
	Overtime: Overtime;
	Diplomacy: Diplomacy;
	PlayersPerTeam: number;
}

//Enums and records need to correspond with the popup frames menuitems order in the risk.fdf file.
export enum GameType {
	Standard = 0,
	Promode = 1,
	Capitals = 2,
	Tournament = 3,
}

export const GameTypeOptions: Record<GameType, string> = {
	[GameType.Standard]: `${HexColors.GREEN}Standard`,
	[GameType.Promode]: `${HexColors.RED}Promode`,
	[GameType.Capitals]: `${HexColors.RED}Capitals`,
	[GameType.Tournament]: `${HexColors.RED}Tournament`,
};

export enum Fog {
	Off = 0,
	On = 1,
	Night = 2,
}

export const FogOptions: Record<Fog, string> = {
	[Fog.Off]: `${HexColors.GREEN}Off`,
	[Fog.On]: `${HexColors.RED}On`,
	[Fog.Night]: `${HexColors.RED}Night`,
};

export enum Overtime {
	Turn30 = 0,
	Turn60 = 1,
	Turn120 = 2,
	Off = 3,
}

export const OvertimeOptions: Record<Overtime, string> = {
	[Overtime.Turn30]: `${HexColors.GREEN}Turn 30`,
	[Overtime.Turn60]: `${HexColors.RED}Turn 60`,
	[Overtime.Turn120]: `${HexColors.RED}Turn 120`,
	[Overtime.Off]: `${HexColors.RED}Off`,
};

export enum Diplomacy {
	FFA = 0,
	DraftTeams = 1,
	RandomTeams = 2,
}

export const DiplomacyOptions: Record<Diplomacy, string> = {
	[Diplomacy.FFA]: `${HexColors.GREEN}FFA`,
	[Diplomacy.DraftTeams]: `${HexColors.RED}Draft Teams`,
	[Diplomacy.RandomTeams]: `${HexColors.RED}Random Teams`,
};

//This enum does not correspond to anything in the fdf files and can be freely changed. It is here to avoid magic numbers.
export enum TeamSize {
	Two = 2,
	Three = 3,
	Four = 4,
	Five = 5,
	Six = 6,
}
