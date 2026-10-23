import { TeamManager } from 'src/app/teams/team-manager';
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
	2: `Random Teams`,
};

export const DiplomacyStringsColorFormatted: Record<number, string> = {
	0: `${HexColors.GREEN}${DiplomacyStrings[0]}|r`,
	1: `${HexColors.RED}${DiplomacyStrings[1]}|r`,
	2: `${HexColors.RED}${DiplomacyStrings[2]}|r`,
};

export class DiplomacyStrategy implements SettingsStrategy {
	private readonly diplomacy: DiplomacyOptions;
	private readonly strategyMap: Map<number, () => void> = new Map([
		[0, this.handleFFA],
		[1, this.handleLobbyTeams],
		[2, this.handleRandomTeams],
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

	// Plays exactly like lobby teams, but the teams are scrambled every round.
	// Applied at the start of every round, after the reset broke the previous round's alliances.
	private handleRandomTeams(): void {
		TeamManager.getInstance().shuffleTeams();
		TeamManager.getInstance().allowFullSharedControl();

		SetMapFlag(MAP_LOCK_ALLIANCE_CHANGES, true);
	}
}
