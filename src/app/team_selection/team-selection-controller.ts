import { PlayerList } from '../entity/player/player-list';
import { Resetable } from '../interfaces/resettable';
import { PlayerData, TeamSelectionModel, TeamSlotData } from './team-selection-model';
import { TeamSelectionView } from './team-selection-view';

export class TeamSelectionController implements Resetable {
	private static instance: TeamSelectionController;
	private model: TeamSelectionModel;
	private view: TeamSelectionView;

	private constructor() {
		this.model = new TeamSelectionModel();
		this.registerPlayers();
		this.view = new TeamSelectionView(this.model);
		this.registerBenchClick();
		this.registerTeamButtonClick();
		this.registerTeamNameBoxEnterPush();
	}

	public static getInstance(): TeamSelectionController {
		if (!this.instance) {
			this.instance = new TeamSelectionController();
		}

		return this.instance;
	}

	public reset(): void {
		this.model.reset();
		this.registerPlayers();
		this.view.reset(this.model);
	}

	public isVisible(): boolean {
		return this.view.isVisible();
	}

	public setVisibility(visibility: boolean): void {
		this.view.setVisibility(visibility);
	}

	public updateTimer(time: number): void {
		this.view.updateTimer(time);
	}

	private registerPlayers(): void {
		let index = 0;

		for (const player of PlayerList.getInstance().getPlayers()) {
			this.model.registerPlayer(player, index);
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
				const playerData: PlayerData = this.model.getPlayerDataForPlayer(player);

				if (playerData.teamNumber === -1) return true;

				this.view.removePlayerFromTeam(player, this.model);
				this.model.removePlayerFromTeam(player, playerData.teamNumber);
				this.view.addPlayerToBench(player, playerData.benchSlotIndex);

				return true;
			})
		);
	}

	private registerTeamButtonClick(): void {
		const trigger = CreateTrigger();

		this.model.getTeamSlotData().forEach((slotData) => {
			BlzTriggerRegisterFrameEvent(trigger, slotData.frame, FRAMEEVENT_CONTROL_CLICK);
		});

		TriggerAddCondition(
			trigger,
			Condition(() => {
				const triggerFrame: framehandle = BlzGetTriggerFrame();
				const clickedSlot: TeamSlotData = this.model.getTeamSlotForFrame(triggerFrame);
				const player: player = GetTriggerPlayer();
				const playerData: PlayerData = this.model.getPlayerDataForPlayer(player);

				if (playerData.slotIndex === clickedSlot.slotIndex) return true;

				if (playerData.teamNumber !== -1) {
					this.view.removePlayerFromTeam(player, this.model);
					this.model.removePlayerFromTeam(player, playerData.teamNumber);
				} else {
					this.view.removePlayerFromBench(playerData.benchSlotIndex);
				}

				const isCaptain: boolean = clickedSlot.isCaptainSlot;

				this.model.addPlayerToTeam(player, clickedSlot.teamNumber, clickedSlot.slotIndex, isCaptain);
				this.view.addPlayerToTeam(player, this.model);

				return true;
			})
		);
	}

	private registerTeamNameBoxEnterPush(): void {
		const trigger = CreateTrigger();

		this.model.getTeamData().forEach((teamData) => {
			BlzTriggerRegisterFrameEvent(trigger, BlzGetFrameByName('TeamNameEditBox', teamData.number), FRAMEEVENT_EDITBOX_ENTER);
		});

		TriggerAddCondition(
			trigger,
			Condition(() => {
				const frameText: string = BlzFrameGetText(BlzGetTriggerFrame());
				const teamNumber: number = this.model.getPlayerDataForPlayer(GetTriggerPlayer()).teamNumber;

				this.model.getTeamDataForTeam(teamNumber).name = frameText;
				this.view.setTeamName(teamNumber, frameText);

				return true;
			})
		);
	}
}
