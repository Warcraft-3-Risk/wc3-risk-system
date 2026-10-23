import { TeamManager } from 'src/app/teams/team-manager';
import { SettingsStrategy } from './settings-strategy';
import { AllyMenuFFASetup } from 'src/app/ui/console';
import { HexColors } from 'src/app/utils/hex-colors';

export interface DiplomacyOptions {
	option: number;
}

export const DiplomacyStrings: Record<number, string> = {
	0: `FFA`,
	1: `Lobby Teams`,
};

export const DiplomacyStringsColorFormatted: Record<number, string> = {
	0: `${HexColors.GREEN}${DiplomacyStrings[0]}|r`,
	1: `${HexColors.RED}${DiplomacyStrings[1]}|r`,
};

export class DiplomacyStrategy implements SettingsStrategy {
	private readonly diplomacy: DiplomacyOptions;
	private readonly strategyMap: Map<number, () => void> = new Map([
		[0, this.handleFFA],
		[1, this.handleLobbyTeams],
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

	// Lobby teams always share full unit control
	private handleLobbyTeams(): void {
		TeamManager.getInstance().allowFullSharedControl();

		SetMapFlag(MAP_LOCK_ALLIANCE_CHANGES, true);
	}
}
