import { PlayerList } from '../entity/player/player-list';
import { Resetable } from '../interfaces/resettable';
import { SettingsController } from '../settings/settings-controller';
import { PlayerData, TeamSelectionModel } from './team-selection-model';
import { TeamSelectionView } from './team-selection-view';

export class TeamSelectionController implements Resetable {
	private static instance: TeamSelectionController;
	private model: TeamSelectionModel;
	private view: TeamSelectionView;

	private constructor() {
		this.model = new TeamSelectionModel();
		this.buildBench();
		this.view = new TeamSelectionView(this.model);
		this.registerBenchClick();
		this.registerTeamButtonClick();
	}

	public static getInstance(): TeamSelectionController {
		if (!this.instance) {
			this.instance = new TeamSelectionController();
		}

		return this.instance;
	}

	public reset(): void {
		this.model.reset();
		this.view.reset(this.model);
	}

	public isVisible(): boolean {
		return this.view.isVisible();
	}

	public setVisibility(visibility: boolean): void {
		this.view.setVisibility(visibility);
	}

	public update(time: number): void {
		this.view.update(time);
	}

	private buildBench(): void {
		let index = 0;

		for (const player of PlayerList.getInstance().getPlayers()) {
			this.model.addPlayerToBench(player, index);
			index++;
		}
	}

	private registerBenchClick(): void {
		const trigger = CreateTrigger();
		BlzTriggerRegisterFrameEvent(trigger, BlzGetFrameByName('BenchButton', 0), FRAMEEVENT_CONTROL_CLICK);

		TriggerAddCondition(
			trigger,
			Condition(() => {
				const player = GetTriggerPlayer();
				const playerData: PlayerData = this.model.getPlayerData().get(player);

				if (!playerData || playerData.teamNumber === -1) return true;

				this.model.removePlayerFromTeam(player);
				this.view.removePlayerFromTeam(player, this.model);
				this.view.addPlayerToBench(player, playerData.benchSlot);

				return true;
			})
		);
	}

	private registerTeamButtonClick(): void {
		const trigger = CreateTrigger();

		this.view.getSlotFrameData().forEach((data, frame) => {
			BlzTriggerRegisterFrameEvent(trigger, frame, FRAMEEVENT_CONTROL_CLICK);
		});

		TriggerAddCondition(
			trigger,
			Condition(() => {
				//TODO
				//This will need TODO the following (feel free to update the order)
				//If player is on bench, remove player from bench in view
				//If player is on a team, remove player from team in view/model & place player on new team in view/model
				//Ensure captains are handled properly by checking if its a captain slot
				//If they are clicking a slot they are already in, return true and do nothing

				return true;
			})
		);
	}
}
