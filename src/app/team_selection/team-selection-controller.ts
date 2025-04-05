import { PlayerList } from '../entity/player/player-list';
import { Resetable } from '../interfaces/resettable';
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
		//TODO
	}
}
