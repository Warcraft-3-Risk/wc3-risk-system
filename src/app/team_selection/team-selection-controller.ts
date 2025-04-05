import { PlayerList } from '../entity/player/player-list';
import { Resetable } from '../interfaces/resettable';
import { TeamSelectionModel } from './team-selection-model';
import { TeamSelectionView } from './team-selection-view';

export class TeamSelectionController implements Resetable {
	private static instance: TeamSelectionController;
	private model: TeamSelectionModel;
	private view: TeamSelectionView;

	private constructor() {
		this.model = new TeamSelectionModel();
		this.setupInitialBench();

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
		throw new Error('Method not implemented.');
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

	private setupInitialBench(): void {
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

				this.model.removePlayerFromTeam(player);
				// this.view.refresh(this.model);

				return true;
			})
		);
	}
}
