import { TeamManager } from 'src/app/teams/team-manager';
import { RandomTeamManager } from 'src/app/teams/random-team-manager';
import { SettingsStrategy } from './settings-strategy';
import { AllyMenuFFASetup } from 'src/app/ui/console';
import { HexColors } from 'src/app/utils/hex-colors';

export interface DiplomacyOptions {
	option: number;
	allyLimit: number;
}

export const DiplomacyStrings: Record<number, string> = {
	0: `FFA`,
	1: `Lobby Teams`,
	2: `Lobby Teams (Shared)`,
	3: `Random Teams`,
	4: `Random Teams (Shared)`,
};

export const DiplomacyStringsColorFormatted: Record<number, string> = {
	0: `${HexColors.GREEN}${DiplomacyStrings[0]}|r`,
	1: `${HexColors.RED}${DiplomacyStrings[1]}|r`,
	2: `${HexColors.RED}${DiplomacyStrings[2]}|r`,
	3: `${HexColors.RED}${DiplomacyStrings[3]}|r`,
	4: `${HexColors.RED}${DiplomacyStrings[4]}|r`,
};

export class DiplomacyStrategy implements SettingsStrategy {
	private readonly diplomacy: DiplomacyOptions;
	private readonly strategyMap: Map<number, () => void> = new Map([
		[0, this.handleFFA],
		[1, this.handleLobbyTeams],
		[2, this.handleLobbyTeamsShared],
		[3, this.handleRandomTeams],
		[4, this.handleRandomTeamsShared],
	]);

	constructor(diplomacy: DiplomacyOptions) {
		this.diplomacy = diplomacy;
	}

	public apply(): void {
		const handler = this.strategyMap.get(this.diplomacy.option);
		if (handler) {
			handler();
		}
	}

	private handleFFA(): void {
		TeamManager.breakTeams();
		AllyMenuFFASetup();
	}

	private handleLobbyTeams(): void {
		TeamManager.getInstance().disableSharedControl();

		SetMapFlag(MAP_LOCK_ALLIANCE_CHANGES, true);
	}

	private handleLobbyTeamsShared(): void {
		TeamManager.getInstance().allowFullSharedControl();

		SetMapFlag(MAP_LOCK_ALLIANCE_CHANGES, true);
	}

	private handleRandomTeams(): void {
		TeamManager.breakTeams();
		const teams = RandomTeamManager.getInstance().assignRandomTeams();
		TeamManager.createWithPresetTeams(teams);
		TeamManager.getInstance().getTeams().forEach((team) => team.giveTeamAlliance());
		TeamManager.getInstance().disableSharedControl();
		SetMapFlag(MAP_LOCK_ALLIANCE_CHANGES, true);
	}

	private handleRandomTeamsShared(): void {
		TeamManager.breakTeams();
		const teams = RandomTeamManager.getInstance().assignRandomTeams();
		TeamManager.createWithPresetTeams(teams);
		TeamManager.getInstance().allowFullSharedControl();
		SetMapFlag(MAP_LOCK_ALLIANCE_CHANGES, true);
	}
}
