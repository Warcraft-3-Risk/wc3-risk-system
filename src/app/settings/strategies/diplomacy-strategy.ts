import { AllyMenuFFASetup } from 'src/app/ui/console';
import { SettingsStrategy } from './settings-strategies.interface';
import { SettingsController } from '../settings-controller';
import { Diplomacy } from '../settings';
import { TeamManager } from 'src/app/entity/team/team-manager';

export class DiplomacyStrategy implements SettingsStrategy {
	private readonly handlers: Map<Diplomacy, () => void>;

	constructor() {
		this.handlers = new Map([
			[Diplomacy.FFA, this.handleFFA],
			[Diplomacy.DraftTeams, this.handleDraftTeams],
			[Diplomacy.RandomTeams, this.handleRandomTeams],
			// [Diplomacy.FreeAlly, this.handleFreeAlly],
		]);
	}

	public apply(settingsController: SettingsController): void {
		const handler = this.handlers.get(settingsController.getDiplomacy());

		if (handler) {
			handler();
		}
	}

	private handleFFA(): void {
		TeamManager.breakTeams();
		AllyMenuFFASetup();
	}

	private handleDraftTeams(): void {
		// TeamManager.getInstance();
		// TeamManager.getInstance().allowFullSharedControl();
		// SetMapFlag(MAP_LOCK_ALLIANCE_CHANGES, true);
	}

	private handleRandomTeams(): void {
		//TODO
	}

	// private handleFreeAlly(): void {
	// 	//TODO

	// 	SetMapFlag(MAP_LOCK_ALLIANCE_CHANGES, false);
	// }
}
