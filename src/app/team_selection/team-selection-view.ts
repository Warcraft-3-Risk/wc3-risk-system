import { Resetable } from '../interfaces/resettable';
import { NameManager } from '../names/name-manager';
import { SettingsController } from '../settings/settings-controller';
import { PlayerData, TeamSelectionModel, TeamSlotData } from './team-selection-model';

export class TeamSelectionView implements Resetable<TeamSelectionModel> {
	private backdrop: framehandle;
	private timerFrame: framehandle;

	public constructor(model: TeamSelectionModel) {
		if (!BlzLoadTOCFile('war3mapImported\\team_selection.toc')) {
			print('Failed to load team_selection.toc');

			return;
		}

		this.backdrop = BlzCreateFrame('TeamSelectionBackdrop', BlzGetOriginFrame(ORIGIN_FRAME_WORLD_FRAME, 0), 0, 0);
		BlzFrameSetPoint(this.backdrop, FRAMEPOINT_CENTER, BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), FRAMEPOINT_CENTER, 0, -0.01);
		const startButton: framehandle = BlzFrameGetChild(this.backdrop, 3);
		const mouseControlFrame = BlzCreateSimpleFrame('TeamSelectionFunctionalStartButton', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0);
		BlzFrameSetPoint(mouseControlFrame, FRAMEPOINT_CENTER, startButton, FRAMEPOINT_CENTER, 0, -0.002);
		BlzFrameSetSize(mouseControlFrame, BlzFrameGetWidth(startButton), BlzFrameGetHeight(startButton) - 0.002);
		BlzFrameSetEnable(startButton, false);
		this.renderBench(model);
		this.buildTeamContainers(model);
	}

	public reset(model: TeamSelectionModel): void {
		model.getPlayerData().forEach((playerData, player) => {
			const benchSlotFrame: framehandle = BlzGetFrameByName('BenchSlotText', playerData.benchSlotIndex);

			BlzFrameSetText(benchSlotFrame, `${NameManager.getInstance().getAcct(player)}`);

			if (model.getTeamData().get(playerData.teamNumber).captain === player) {
				this.setEnableTeamSettingButtonForPlayer(playerData.teamNumber, player, false);
			}
		});

		const teamSlotDataMap = model.getTeamSlotData();

		teamSlotDataMap.forEach((slotData, context) => {
			const frameText = slotData.isCaptainSlot ? 'Open Slot (Captain)' : 'Open Slot (Member)';

			BlzFrameSetText(slotData.frame, frameText);
		});
	}

	public updateTimer(time: number): void {
		BlzFrameSetText(this.timerFrame, time.toString());
	}

	public setVisibility(visibility: boolean): void {
		BlzFrameSetEnable(this.backdrop, visibility);
		BlzFrameSetVisible(this.backdrop, visibility);
		BlzFrameSetEnable(BlzGetFrameByName('TeamSelectionFunctionalStartButton', 0), false);
	}

	public isVisible(): boolean {
		return BlzFrameIsVisible(this.backdrop);
	}

	public addPlayerToBench(player: player, benchSlot: number): void {
		const textFrame: framehandle = BlzGetFrameByName('BenchSlotText', benchSlot);
		BlzFrameSetText(textFrame, `${NameManager.getInstance().getAcct(player)}`);
	}

	public removePlayerFromBench(benchSlot: number): void {
		const textFrame: framehandle = BlzGetFrameByName('BenchSlotText', benchSlot);
		BlzFrameSetText(textFrame, `-`);
	}

	public addPlayerToTeam(player: player, model: TeamSelectionModel): void {
		const playerData: PlayerData = model.getPlayerDataForPlayer(player);
		const slotData: TeamSlotData = model.getTeamSlotDataForIndex(playerData.slotIndex);

		BlzFrameSetText(slotData.frame, NameManager.getInstance().getAcct(player));

		if (slotData.isCaptainSlot) {
			this.setEnableTeamSettingButtonForPlayer(playerData.teamNumber, player, true);
		}
	}

	public removePlayerFromTeam(player: player, model: TeamSelectionModel): void {
		const playerData: PlayerData = model.getPlayerDataForPlayer(player);
		const slotData: TeamSlotData = model.getTeamSlotDataForIndex(playerData.slotIndex);
		const frameText = slotData.isCaptainSlot ? 'Open Slot (Captain)' : 'Open Slot (Member)';

		BlzFrameSetText(slotData.frame, frameText);

		if (slotData.isCaptainSlot) {
			this.setEnableTeamSettingButtonForPlayer(playerData.teamNumber, player, false);
		}
	}

	private renderBench(model: TeamSelectionModel): void {
		const data: Map<player, PlayerData> = model.getPlayerData();
		const parentFrame: framehandle = BlzGetFrameByName('BenchButton', 0);
		const step: number = -0.012;
		let yOffset: number = -0.003;

		data.forEach((playerData, player) => {
			const textFrame: framehandle = BlzCreateFrame('BenchSlotText', parentFrame, 0, data.get(player).benchSlotIndex);

			BlzFrameSetPoint(textFrame, FRAMEPOINT_TOP, parentFrame, FRAMEPOINT_BOTTOM, 0.0, yOffset);
			BlzFrameSetText(textFrame, `${NameManager.getInstance().getAcct(player)}`);
			yOffset += step;
		});
	}

	private buildTeamContainers(model: TeamSelectionModel): void {
		const playersPerTeam: number = SettingsController.getInstance().getTeamSize();
		const rows: number = 3;
		const teamsPerRow: number = 4;
		let teamNumber: number = 1;
		let yOffset: number = -0.04;

		for (let i = 0; i < rows; i++) {
			this.buildTeamContainerRow(teamsPerRow, model, teamNumber, yOffset, playersPerTeam);
			teamNumber += teamsPerRow;
			yOffset += -0.16;
		}
	}

	private buildTeamContainerRow(
		teamsPerRow: number,
		model: TeamSelectionModel,
		teamNumber: number,
		yOffset: number,
		playersPerTeam: number
	) {
		let xOffset: number = 0.01;

		for (let i = 0; i < teamsPerRow; i++) {
			model.registerTeam(teamNumber);

			const teamContainerFrame: framehandle = BlzCreateFrame('TeamContainerTemplate', this.backdrop, 0, teamNumber);

			BlzFrameSetPoint(teamContainerFrame, FRAMEPOINT_TOPLEFT, this.backdrop, FRAMEPOINT_TOPLEFT, xOffset, yOffset);
			this.disableTeamSettingButton(teamNumber);

			const teamNameFrame: framehandle = BlzGetFrameByName('TeamName', teamNumber);

			BlzFrameSetText(teamNameFrame, `Team ${teamNumber}`);

			const index: number = model.generateTeamSlotIndex();
			const captainSlotFrame: framehandle = BlzCreateFrame('SlotButtonTemplate', teamContainerFrame, 0, index);

			BlzFrameSetPoint(captainSlotFrame, FRAMEPOINT_TOP, teamContainerFrame, FRAMEPOINT_TOP, -0.005, -0.02);
			BlzFrameSetText(captainSlotFrame, 'Open Slot (Captain)');

			model.registerTeamSlot(index, captainSlotFrame, teamNumber, true);

			for (let j = 1; j < playersPerTeam; j++) {
				const index: number = model.generateTeamSlotIndex();
				const slotFrame: framehandle = BlzCreateFrame('SlotButtonTemplate', teamContainerFrame, 0, index);
				const parentFrame: framehandle = BlzGetFrameByName('SlotButtonTemplate', index - 1);

				BlzFrameSetPoint(slotFrame, FRAMEPOINT_TOP, parentFrame, FRAMEPOINT_BOTTOM, 0.0, -0.001);

				model.registerTeamSlot(index, slotFrame, teamNumber, false);
			}

			teamNumber++;
			xOffset += 0.13;
		}
	}

	private setEnableTeamSettingButtonForPlayer(teamNumber: number, player: player, enabled: boolean) {
		if (GetLocalPlayer() === player) {
			BlzFrameSetEnable(BlzGetFrameByName('TeamOptionsButton', teamNumber), enabled);
		}
	}

	private disableTeamSettingButton(teamNumber: number) {
		BlzFrameSetEnable(BlzGetFrameByName('TeamOptionsButton', teamNumber), false);
	}
}
