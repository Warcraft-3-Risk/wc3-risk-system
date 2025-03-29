import { PlayerList } from '../entity/player/player-list';
import { Resetable } from '../interfaces/resettable';
import { NameManager } from '../names/name-manager';
import { SettingsController } from '../settings/settings-controller';

interface playerData {
	bench: number;
	team: number;
	slot: number;
}

interface TeamData {
	players: Set<player>;
	slots: boolean[];
	captain: player | null;
	color: string | null;
}

export class TeamSelectionView implements Resetable {
	public static instance: TeamSelectionView;
	private bench: Set<player>;
	private playerData: Map<player, playerData>;
	private teams: Map<number, TeamData>;
	private backdrop: framehandle;
	private timerFrame: framehandle;

	public constructor(timerDuration: number) {
		if (!BlzLoadTOCFile('war3mapImported\\team_selection.toc')) {
			print('Failed to load team_selection.toc');
			return;
		}

		if (!BlzLoadTOCFile('war3mapImported\\components.toc')) {
			print('Failed to load components.toc');
			return;
		}

		this.bench = new Set<player>();
		this.playerData = new Map<player, playerData>();
		this.teams = new Map<number, TeamData>();

		this.backdrop = BlzCreateFrame('TeamSelectionBackdrop', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);
		BlzFrameSetPoint(this.backdrop, FRAMEPOINT_CENTER, BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), FRAMEPOINT_CENTER, 0, -0.01);
		this.buildBench();
		this.buildTeamContainers();
		// this.update(timerDuration);
	}

	public reset(): void {
		//TODO complete reset to prepare for new game/team selection state
	}

	public update(time: number): void {
		BlzFrameSetText(this.timerFrame, time.toString());
	}

	public hide(): void {
		BlzFrameSetEnable(this.backdrop, false);
		BlzFrameSetVisible(this.backdrop, false);
	}

	public isVisible(): boolean {
		return BlzFrameIsVisible(this.backdrop);
	}

	public removePlayer(): void {
		//TODO Used to remove a player from the team selection system when they leave the game
	}

	private buildBench(): void {
		PlayerList.getInstance()
			.getPlayers()
			.forEach((player) => {
				this.bench.add(player);
			});

		let frameIndex: number = 0;
		let initialOffset: number = -0.003;
		const offSetModifier: number = -0.012;
		const parentFrame: framehandle = BlzGetFrameByName('BenchButton', 0);

		this.bench.forEach((player) => {
			const playerList: framehandle = BlzCreateFrame('TextTemplateSm', parentFrame, 5, frameIndex);

			BlzFrameSetPoint(playerList, FRAMEPOINT_TOP, parentFrame, FRAMEPOINT_BOTTOM, 0.0, initialOffset);
			BlzFrameSetText(playerList, `${NameManager.getInstance().getAcct(player)}`);
			this.playerData.set(player, { bench: frameIndex, team: -1, slot: -1 });

			frameIndex++;
			initialOffset += offSetModifier;
		});
	}

	private handleBenchButton(): void {
		const trigger: trigger = CreateTrigger();

		BlzTriggerRegisterFrameEvent(trigger, BlzGetFrameByName('BenchButton', 0), FRAMEEVENT_CONTROL_CLICK);

		TriggerAddCondition(
			trigger,
			Condition(() => {
				const triggerPlayer: player = GetTriggerPlayer();
				const playerData = this.playerData.get(triggerPlayer);

				// if (playerData && playerData.team != -1) {
				// 	this.leaveTeam(triggerPlayer);
				// }

				return true;
			})
		);
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
			BlzFrameSetPoint(teamContainerFrame, FRAMEPOINT_TOPLEFT, this.backdrop, FRAMEPOINT_TOPLEFT, xOffset, yOffset);
			const teamNameFrame: framehandle = BlzGetFrameByName('TeamName', teamNumber);
			BlzFrameSetText(teamNameFrame, `Team ${teamNumber}`);
			const slotContext: number = teamNumber * 100;
			const firstSlotFrame: framehandle = BlzCreateFrame('SlotButtonTemplate', teamContainerFrame, 0, slotContext); //context = 100
			BlzFrameSetPoint(firstSlotFrame, FRAMEPOINT_TOP, teamContainerFrame, FRAMEPOINT_TOP, -0.005, -0.02);
			BlzFrameSetText(firstSlotFrame, 'Open Slot (Captain)');

			for (let j = 1; j < playersPerTeam; j++) {
				const slotFrame: framehandle = BlzCreateFrame('SlotButtonTemplate', teamContainerFrame, 0, slotContext + j); //context = 100 + 1
				const parentFrame: framehandle = BlzGetFrameByName('SlotButtonTemplate', slotContext + j - 1); //context = 100 + j - 1
				BlzFrameSetPoint(slotFrame, FRAMEPOINT_TOP, parentFrame, FRAMEPOINT_BOTTOM, 0.0, -0.001);
			}

			teamNumber++;
			xOffset += 0.13;
		}
	}

	// private leaveTeam(player: player) {
	// 	const playerData = this.playerData.get(player);

	// 	if (playerData && playerData.team != -1) {
	// 		BlzFrameSetText(BlzGetFrameByName(`TeamSlot`, playerData.slot), `-`);
	// 		this.teams.get(playerData.team).slots[playerData.slot] = false;
	// 		BlzFrameSetText(BlzGetFrameByName('PlayerList', playerData.bench), `${NameManager.getInstance().getAcct(player)}`);
	// 		this.teams.get(playerData.team)?.players.delete(player);

	// 		if (this.teams.get(playerData.team)?.captain === player) {
	// 			this.reassignCaptain(playerData.team);
	// 		}

	// 		playerData.slot = -1;
	// 		playerData.team = -1;
	// 	}
	// }

	// private reassignCaptain(teamNumber: number) {
	// 	const teamData = this.teams.get(teamNumber);

	// 	if (teamData) {
	// 		const previousCaptain = teamData.captain;
	// 		const playersIterator = teamData.players.values();
	// 		const newCaptain = playersIterator.next().value || null;
	// 		teamData.captain = newCaptain;

	// 		if (previousCaptain && previousCaptain == GetLocalPlayer()) {
	// 			BlzFrameSetEnable(BlzGetFrameByName('EscMenuEditBoxTemplate', teamNumber), false);
	// 		}

	// 		if (newCaptain && newCaptain == GetLocalPlayer()) {
	// 			BlzFrameSetEnable(BlzGetFrameByName('EscMenuEditBoxTemplate', teamNumber), true);
	// 		}
	// 	}
	// }
}
