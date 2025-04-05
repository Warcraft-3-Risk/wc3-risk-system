import { Resetable } from '../interfaces/resettable';
import { NameManager } from '../names/name-manager';
import { SettingsController } from '../settings/settings-controller';
import { TeamSelectionModel } from './team-selection-model';

export class TeamSelectionView implements Resetable {
	private backdrop: framehandle;
	private timerFrame: framehandle;
	private teamSlotFrames: Map<number, framehandle[]>;

	public constructor(model: TeamSelectionModel) {
		if (!BlzLoadTOCFile('war3mapImported\\team_selection.toc')) {
			print('Failed to load team_selection.toc');

			return;
		}

		this.teamSlotFrames = new Map<number, framehandle[]>();
		this.backdrop = BlzCreateFrame('TeamSelectionBackdrop', BlzGetOriginFrame(ORIGIN_FRAME_WORLD_FRAME, 0), 0, 0);
		BlzFrameSetPoint(this.backdrop, FRAMEPOINT_CENTER, BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), FRAMEPOINT_CENTER, 0, -0.01);
		const startButton: framehandle = BlzFrameGetChild(this.backdrop, 3);
		const mouseControlFrame = BlzCreateSimpleFrame('TeamSelectionFunctionalStartButton', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0);
		BlzFrameSetPoint(mouseControlFrame, FRAMEPOINT_CENTER, startButton, FRAMEPOINT_CENTER, 0, -0.002);
		BlzFrameSetSize(mouseControlFrame, BlzFrameGetWidth(startButton), BlzFrameGetHeight(startButton) - 0.002);
		BlzFrameSetEnable(startButton, false);
		this.renderBench(model);
		this.buildTeamContainers();
	}

	public reset(): void {
		//TODO complete reset to prepare for new game/team selection state
	}

	public update(time: number): void {
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

	public refreshBench(model: TeamSelectionModel): void {}

	private renderBench(model: TeamSelectionModel): void {
		const parentFrame: framehandle = BlzGetFrameByName('BenchButton', 0);
		const step: number = -0.012;
		let yOffset: number = -0.003;

		model.playerData.forEach((playerData, player) => {
			const textFrame: framehandle = BlzCreateFrame('TextTemplateSm', parentFrame, 0, model.playerData.get(player).benchSlot);
			BlzFrameSetPoint(textFrame, FRAMEPOINT_TOP, parentFrame, FRAMEPOINT_BOTTOM, 0.0, yOffset);
			BlzFrameSetText(textFrame, `${NameManager.getInstance().getAcct(player)}`);

			yOffset += step;
		});
	}

	private buildTeamContainers(): void {
		const playersPerTeam: number = SettingsController.getInstance().getTeamSize();
		const rows: number = 3;
		const teamsPerRow: number = 4;
		let teamNumber: number = 1;
		let yOffset: number = -0.04;

		for (let i = 0; i < rows; i++) {
			this.buildTeamContainerRow(yOffset, playersPerTeam, teamNumber, teamsPerRow);
			teamNumber += teamsPerRow;
			yOffset += -0.16;
		}
	}

	private buildTeamContainerRow(yOffset: number, playersPerTeam: number, teamNumber: number, teamsPerRow: number) {
		let xOffset: number = 0.01;

		for (let i = 0; i < teamsPerRow; i++) {
			const teamContainerFrame: framehandle = BlzCreateFrame('TeamContainerTemplate', this.backdrop, 0, teamNumber);
			const slotContext: number = teamNumber * 100;
			const slotFrames: framehandle[] = [];
			BlzFrameSetPoint(teamContainerFrame, FRAMEPOINT_TOPLEFT, this.backdrop, FRAMEPOINT_TOPLEFT, xOffset, yOffset);
			const teamNameFrame: framehandle = BlzGetFrameByName('TeamName', teamNumber);
			BlzFrameSetText(teamNameFrame, `Team ${teamNumber}`);
			const captainSlotFrame: framehandle = BlzCreateFrame('SlotButtonTemplate', teamContainerFrame, 0, slotContext);
			BlzFrameSetPoint(captainSlotFrame, FRAMEPOINT_TOP, teamContainerFrame, FRAMEPOINT_TOP, -0.005, -0.02);
			BlzFrameSetText(captainSlotFrame, 'Open Slot (Captain)');

			slotFrames.push(captainSlotFrame);

			for (let j = 1; j < playersPerTeam; j++) {
				const slotFrame: framehandle = BlzCreateFrame('SlotButtonTemplate', teamContainerFrame, 0, slotContext + j);
				const parentFrame: framehandle = BlzGetFrameByName('SlotButtonTemplate', slotContext + j - 1);

				BlzFrameSetPoint(slotFrame, FRAMEPOINT_TOP, parentFrame, FRAMEPOINT_BOTTOM, 0.0, -0.001);

				slotFrames.push(slotFrame);
			}

			this.teamSlotFrames.set(teamNumber, slotFrames);
			teamNumber++;
			xOffset += 0.13;
		}
	}
}
