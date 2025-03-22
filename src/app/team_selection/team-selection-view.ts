import { PlayerList } from '../entity/player/player-list';
import { Resetable } from '../interfaces/resettable';
import { NameManager } from '../names/name-manager';

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

		this.backdrop = BlzCreateFrame('TeamOptionsBackdrop', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);
		BlzFrameSetPoint(this.backdrop, FRAMEPOINT_CENTER, BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), FRAMEPOINT_CENTER, 0, -0.01);
		this.buildBench();
		// this.buildTeams();
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

	private buildTeams(): void {
		const editBoxFrame: framehandle = BlzCreateFrame('EditBoxTemplate', this.backdrop, 0, 0);
		BlzFrameSetPoint(editBoxFrame, FRAMEPOINT_CENTER, this.backdrop, FRAMEPOINT_CENTER, 0, 0);
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
