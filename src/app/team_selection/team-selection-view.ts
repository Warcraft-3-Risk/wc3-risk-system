import { Resetable } from '../interfaces/resettable';
import { NameManager } from '../names/name-manager';
import { SettingsController } from '../settings/settings-controller';
import { PlayerData, TeamSelectionModel } from './team-selection-model';

export interface SlotFrameData {
	context: number;
	teamNumber: number;
	isCaptainSlot: boolean;
}

export class TeamSelectionView implements Resetable<TeamSelectionModel> {
	private backdrop: framehandle;
	private timerFrame: framehandle;
	private slotFrameData: Map<framehandle, SlotFrameData>;
	private slotFrameLookup: Map<string, framehandle>;

	public constructor(model: TeamSelectionModel) {
		if (!BlzLoadTOCFile('war3mapImported\\team_selection.toc')) {
			print('Failed to load team_selection.toc');

			return;
		}

		this.slotFrameData = new Map<framehandle, SlotFrameData>();
		this.slotFrameLookup = new Map<string, framehandle>();
		this.backdrop = BlzCreateFrame('TeamSelectionBackdrop', BlzGetOriginFrame(ORIGIN_FRAME_WORLD_FRAME, 0), 0, 0);
		BlzFrameSetPoint(this.backdrop, FRAMEPOINT_CENTER, BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), FRAMEPOINT_CENTER, 0, -0.01);
		const startButton: framehandle = BlzFrameGetChild(this.backdrop, 3);
		const mouseControlFrame = BlzCreateSimpleFrame('TeamSelectionFunctionalStartButton', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0);
		BlzFrameSetPoint(mouseControlFrame, FRAMEPOINT_CENTER, startButton, FRAMEPOINT_CENTER, 0, -0.002);
		BlzFrameSetSize(mouseControlFrame, BlzFrameGetWidth(startButton), BlzFrameGetHeight(startButton) - 0.002);
		BlzFrameSetEnable(startButton, false);
		this.renderBench(model);
		this.buildTeamContainers();
		this.disableTeamSettingsButtons();
	}

	public reset(model: TeamSelectionModel): void {
		const data: Map<player, PlayerData> = model.getPlayerData();

		data.forEach((playerData, player) => {
			const textFrame: framehandle = BlzGetFrameByName('BenchSlotText', data.get(player).benchSlot);
			BlzFrameSetText(textFrame, `${NameManager.getInstance().getAcct(player)}`);
		});

		this.slotFrameData.forEach((data, frame) => {
			data.isCaptainSlot === true ? BlzFrameSetText(frame, 'Open Slot (Captain)') : BlzFrameSetText(frame, 'Open Slot (Member)');
		});
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

	public addPlayerToBench(player: player, benchSlot: number): void {
		const textFrame: framehandle = BlzGetFrameByName('BenchSlotText', benchSlot);
		BlzFrameSetText(textFrame, `${NameManager.getInstance().getAcct(player)}`);
	}

	public removePlayerFromBench(benchSlot: number): void {
		const textFrame: framehandle = BlzGetFrameByName('BenchSlotText', benchSlot);
		BlzFrameSetText(textFrame, `-`);
	}

	public addPlayerToTeam(player: player, model: TeamSelectionModel): void {
		const data = model.getPlayerData().get(player);

		if (!data) return;

		const key = `${data.teamNumber}-${data.teamSlot}`;
		const slotFrame = this.slotFrameLookup.get(key);

		if (!slotFrame) return;

		BlzFrameSetText(slotFrame, NameManager.getInstance().getAcct(player));
	}

	public removePlayerFromTeam(player: player, model: TeamSelectionModel): void {
		const data = model.getPlayerData().get(player);

		if (!data || data.teamNumber === -1) return;

		const key = `${data.teamNumber}-${data.teamSlot}`;
		const slotFrame = this.slotFrameLookup.get(key);

		if (!slotFrame) return;

		const slotInfo = this.slotFrameData.get(slotFrame);
		const text = slotInfo?.isCaptainSlot ? 'Open Slot (Captain)' : 'Open Slot (Member)';
		BlzFrameSetText(slotFrame, text);
	}

	public getSlotFrameData(): Map<framehandle, SlotFrameData> {
		return this.slotFrameData;
	}

	public getSlotFrameKeys(): Map<string, framehandle> {
		return this.slotFrameLookup;
	}

	public disableTeamSettingsButtons() {
		let teamNumber: number = 1;

		for (let i = 1; i <= 12; i++) {
			BlzFrameSetEnable(BlzGetFrameByName('TeamOptionsButton', teamNumber), false); //TODO test to make sure this works
			teamNumber++;
		}
	}

	private renderBench(model: TeamSelectionModel): void {
		const data: Map<player, PlayerData> = model.getPlayerData();
		const parentFrame: framehandle = BlzGetFrameByName('BenchButton', 0);
		const step: number = -0.012;
		let yOffset: number = -0.003;

		data.forEach((playerData, player) => {
			const textFrame: framehandle = BlzCreateFrame('BenchSlotText', parentFrame, 0, data.get(player).benchSlot);
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
			BlzFrameSetPoint(teamContainerFrame, FRAMEPOINT_TOPLEFT, this.backdrop, FRAMEPOINT_TOPLEFT, xOffset, yOffset);
			const teamNameFrame: framehandle = BlzGetFrameByName('TeamName', teamNumber);
			BlzFrameSetText(teamNameFrame, `Team ${teamNumber}`);
			const captainSlotFrame: framehandle = BlzCreateFrame('SlotButtonTemplate', teamContainerFrame, 0, slotContext);
			BlzFrameSetPoint(captainSlotFrame, FRAMEPOINT_TOP, teamContainerFrame, FRAMEPOINT_TOP, -0.005, -0.02);
			BlzFrameSetText(captainSlotFrame, 'Open Slot (Captain)');

			this.storeFrameData(captainSlotFrame, slotContext, teamNumber, true);

			for (let j = 1; j < playersPerTeam; j++) {
				const context: number = slotContext + j;
				const slotFrame: framehandle = BlzCreateFrame('SlotButtonTemplate', teamContainerFrame, 0, context);
				const parentFrame: framehandle = BlzGetFrameByName('SlotButtonTemplate', context - 1);

				BlzFrameSetPoint(slotFrame, FRAMEPOINT_TOP, parentFrame, FRAMEPOINT_BOTTOM, 0.0, -0.001);

				this.storeFrameData(slotFrame, context, teamNumber, false);
			}

			teamNumber++;
			xOffset += 0.13;
		}
	}

	private storeFrameData(frame: framehandle, context: number, teamNumber: number, isCaptain: boolean) {
		this.slotFrameData.set(frame, {
			context: context,
			teamNumber: teamNumber,
			isCaptainSlot: isCaptain,
		});

		this.slotFrameLookup.set(`${teamNumber}-${context}`, frame);
	}
}
