import { PlayerManager } from '../entity/player/player-manager';
import { GameState } from '../game/game-state';
import { NameManager } from '../managers/names/name-manager';
import { SettingsController } from '../settings/settings-controller';
import { EventTimer } from '../timer/EventTimer';
import { HexColors } from '../utils/hex-colors';

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

export class TeamSelectionView {
	private static backdrop: framehandle;
	private static bench: Set<player> = new Set<player>();
	private static playerData: Map<player, playerData> = new Map<player, playerData>();
	private static teams: Map<number, TeamData> = new Map<number, TeamData>();
	private static teamColumnPositions: Record<number, { x: number; y: number }> = {
		0: { x: 0.038, y: -0.06 },
		1: { x: 0.158, y: -0.06 },
		2: { x: 0.278, y: -0.06 },
		3: { x: 0.398, y: -0.06 },
		4: { x: 0.518, y: -0.06 },
		5: { x: 0.038, y: -0.23 },
		6: { x: 0.158, y: -0.23 },
		7: { x: 0.278, y: -0.23 },
		8: { x: 0.398, y: -0.23 },
		9: { x: 0.518, y: -0.23 },
		10: { x: 0.038, y: -0.4 },
	};
	private static colors = {
		Red: '|cffff0303',
		Blue: '|cff0042ff',
		Teal: '|cff1be7ba',
		Purple: '|cff550081',
		Yellow: '|cfffefc00',
		Orange: '|cfffe890d',
		Green: '|cff21bf00',
		Pink: '|cffe45caf',
		Gray: '|cff939596',
		'Light Blue': '|cff77bbff',
		'Dark Green': '|cff106247',
		Brown: '|cff4f2b05',
		Maroon: '|cff9c0000',
		Navy: '|cff0000c3',
		Turquoise: '|cff00ebff',
		Violet: '|cffbd00ff',
		Wheat: '|cffecce87',
		Peach: '|cfff7a58b',
		Mint: '|cffccff99',
		Lavender: '|cffdbb8eb',
	};
	private static colorButtons: Map<number, Map<string, framehandle>> = new Map<number, Map<string, framehandle>>();

	public static build(duration: number, gameState: GameState) {
		if (!BlzLoadTOCFile('war3mapImported\\team_selection.toc')) {
			print('Failed to load team_selection.toc');
			return;
		}

		if (!BlzLoadTOCFile('war3mapImported\\components.toc')) {
			print('Failed to load team_selection.toc');
			return;
		}
		// const buttonFrame = BlzCreateFrame('ColorSelectionButton', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);
		// BlzFrameSetPoint(buttonFrame, FRAMEPOINT_CENTER, BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), FRAMEPOINT_CENTER, 0, 0);
		// const buttonIconFrame = BlzGetFrameByName('ColorSelectionButtonIcon', 0);
		// BlzFrameSetTexture(buttonIconFrame, 'ReplaceableTextures\\CommandButtons\\BTNHeroPaladin.blp', 0, true);
		// const test = BlzGetFrameByName('ColorSelectionButtonPushed', 0);
		// BlzFrameSetTexture(test, 'ReplaceableTextures\\TeamColor\\TeamColor00.blp', 0, true);
		// SetPoint CENTER, "TeamOptionsBackdrop", CENTER, 0, -0.0765,
		const backdrop = BlzCreateFrame('TeamOptionsBackdrop', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);
		BlzFrameSetPoint(backdrop, FRAMEPOINT_CENTER, BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), FRAMEPOINT_CENTER, 0, 0);

		const frame = BlzCreateFrame('ColorButtonTemplate', backdrop, 0, 0);
		BlzFrameSetPoint(frame, FRAMEPOINT_CENTER, backdrop, FRAMEPOINT_CENTER, 0, 0);
		const texture = BlzGetFrameByName('ColorButtonTexture', 0);
		BlzFrameSetTexture(texture, 'ReplaceableTextures\\TeamColor\\TeamColor00.blp', 0, true);
		const model = BlzCreateFrameByType('SPRITE', 'SpriteName', frame, '', 0);
		BlzFrameSetAllPoints(model, texture);
		BlzFrameSetModel(model, 'UI\\Feedback\\Autocast\\UI-ModalButtonOn.mdl', 0);
		BlzFrameSetScale(model, 0.46);
		// BlzFrameSetVisible(model, false);
		// BlzFrameSetAllPoints(model, backdrop);

		// const testDROP = BlzCreateFrame('TESTDROP', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);
		// BlzFrameSetPoint(testDROP, FRAMEPOINT_CENTER, BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), FRAMEPOINT_TOP, 0, -0.1);

		// // const testButton = BlzCreateFrame('TESTBUTTON', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);
		// // BlzFrameSetPoint(testButton, FRAMEPOINT_CENTER, testDROP, FRAMEPOINT_CENTER, 0, 0);
		// BlzFrameSetTexture(BlzGetFrameByName('TESTBUTTONICON', 0), 'ReplaceableTextures\\TeamColor\\TeamColor00.blp', 0, true);

		// const button = BlzCreateFrameByType('BUTTON', 'MyIconButton', testDROP, 'ScoreScreenTabButtonTemplate', 0);
		// const buttonIconFrame = BlzCreateFrameByType('BACKDROP', 'MyIconButtonIcon', button, '', 0);
		// BlzFrameSetAllPoints(buttonIconFrame, button);
		// BlzFrameSetPoint(button, FRAMEPOINT_CENTER, testDROP, FRAMEPOINT_CENTER, 0, 0);
		// BlzFrameSetSize(button, 0.03, 0.03);
		// BlzFrameSetTexture(buttonIconFrame, 'ReplaceableTextures\\TeamColor\\TeamColor01.blp', 0, false);
		// BlzFrameSetLevel(frame, 5);

		// const buttonIconFrame = BlzGetFrameByName('ColorSelectionCurrentBackdrop', 0);
		// BlzFrameSetTexture(buttonIconFrame, 'ReplaceableTextures\\TeamColor\\TeamColor01.blp', 0, true);

		// TeamSelectionView.initializeData();
		// TeamSelectionView.createBackdrop();
		// TeamSelectionView.createTitle();
		// TeamSelectionView.createBenchComponents();
		// TeamSelectionView.createTimerComponents(duration, gameState);
		// TeamSelectionView.createTeamColumns();
	}

	private static initializeData() {
		TeamSelectionView.bench.clear();
		TeamSelectionView.playerData.clear();
		TeamSelectionView.teams.clear();
		PlayerManager.getInstance()
			.getPlayers()
			.forEach((player) => {
				TeamSelectionView.bench.add(player.getPlayer());
			});
	}

	private static createBackdrop() {
		const backdropWidth: number = 1;
		TeamSelectionView.backdrop = BlzCreateFrame('QuestButtonBaseTemplate', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);
		BlzFrameSetPoint(TeamSelectionView.backdrop, FRAMEPOINT_TOP, BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), FRAMEPOINT_TOP, 0, -0.021);
		BlzFrameSetSize(TeamSelectionView.backdrop, backdropWidth, 0.56);
	}

	private static createTitle() {
		const titleText: framehandle = BlzCreateFrameByType('TEXT', 'TeamSelectionTitle', TeamSelectionView.backdrop, '', 0);
		BlzFrameSetPoint(titleText, FRAMEPOINT_TOP, TeamSelectionView.backdrop, FRAMEPOINT_TOP, 0.0, -0.01);
		BlzFrameSetText(titleText, `${HexColors.TANGERINE}Team Selection|r`);
		BlzFrameSetScale(titleText, 2);
	}

	private static createBenchComponents() {
		const benchText: framehandle = BlzCreateFrameByType('TEXT', 'PlayerBenchTitle', TeamSelectionView.backdrop, '', 0);
		BlzFrameSetPoint(benchText, FRAMEPOINT_TOPLEFT, TeamSelectionView.backdrop, FRAMEPOINT_TOPLEFT, 0.448, -0.045);
		BlzFrameSetText(benchText, `${HexColors.TANGERINE}Player Bench|r`);
		BlzFrameSetScale(benchText, 1.5);

		const benchButton: framehandle = BlzCreateFrameByType(
			'GLUETEXTBUTTON',
			'TeamSelectionBenchButton',
			TeamSelectionView.backdrop,
			'ScriptDialogButton',
			0
		);
		BlzFrameSetText(benchButton, 'Join Bench');
		BlzFrameSetSize(benchButton, 0.095, 0.025);
		BlzFrameSetPoint(benchButton, FRAMEPOINT_TOP, benchText, FRAMEPOINT_BOTTOM, 0, -0.004);

		const benchTrig: trigger = CreateTrigger();
		BlzTriggerRegisterFrameEvent(benchTrig, benchButton, FRAMEEVENT_CONTROL_CLICK);
		TriggerAddCondition(
			benchTrig,
			Condition(() => {
				const triggerPlayer: player = GetTriggerPlayer();
				const playerData = TeamSelectionView.playerData.get(triggerPlayer);

				if (playerData && playerData.team != -1) {
					TeamSelectionView.leaveTeam(triggerPlayer);
				}
			})
		);

		let x: number = 0;
		let initialOffset: number = -0.003;
		const offSetModifier: number = -0.015;

		TeamSelectionView.bench.forEach((player) => {
			const playerList: framehandle = BlzCreateFrameByType('TEXT', 'PlayerList', TeamSelectionView.backdrop, '', x);
			BlzFrameSetPoint(playerList, FRAMEPOINT_TOP, benchButton, FRAMEPOINT_BOTTOM, 0, initialOffset);
			BlzFrameSetText(playerList, `${NameManager.getInstance().getAcct(player)}`);
			TeamSelectionView.playerData.set(player, { bench: x, team: -1, slot: -1 });
			x++;
			initialOffset += offSetModifier;
		});
	}

	private static createTimerComponents(duration: number, gameState: GameState) {
		const timer: framehandle = BlzCreateFrameByType('TEXT', 'TeamSelectionTimer', TeamSelectionView.backdrop, '', 0);
		BlzFrameSetScale(timer, 1.2);
		BlzFrameSetPoint(timer, FRAMEPOINT_TOPRIGHT, TeamSelectionView.backdrop, FRAMEPOINT_TOPRIGHT, -0.01, -0.01);
		BlzFrameSetText(timer, `${duration}`);

		const timerLabel: framehandle = BlzCreateFrameByType('TEXT', 'TeamSelectionTimerLabel', TeamSelectionView.backdrop, '', 0);
		BlzFrameSetText(timerLabel, `${HexColors.TANGERINE}Auto Start in:`);
		BlzFrameSetScale(timerLabel, 1.2);
		BlzFrameSetPoint(timerLabel, FRAMEPOINT_TOPRIGHT, TeamSelectionView.backdrop, FRAMEPOINT_TOPRIGHT, -0.03, -0.01);

		const startButton: framehandle = BlzCreateFrameByType(
			'GLUETEXTBUTTON',
			'TeamSelectionStartButton',
			TeamSelectionView.backdrop,
			'ScriptDialogButton',
			0
		);
		BlzFrameSetText(startButton, 'Start Now');
		BlzFrameSetSize(startButton, 0.095, 0.025);
		BlzFrameSetPoint(startButton, FRAMEPOINT_TOP, timerLabel, FRAMEPOINT_BOTTOM, 0.015, 0);

		const buttonTrig: trigger = CreateTrigger();
		BlzTriggerRegisterFrameEvent(buttonTrig, startButton, FRAMEEVENT_CONTROL_CLICK);
		TriggerAddCondition(
			buttonTrig,
			Condition(() => {
				if (TeamSelectionView.bench.size <= 0) {
					TeamSelectionView.hide();
					EventTimer.getInstance().stopEvent('uiTimer');
					gameState.end();
				} else {
					//TODO Sound bite or other action
				}
			})
		);
	}

	private static createTeamColumns() {
		const cols: number = 11; //Math.ceil(TeamSelectionView.bench.size / SettingsController.getInstance().getTeamSize());

		for (let i = 0; i < cols; i++) {
			const position = TeamSelectionView.teamColumnPositions[i];
			TeamSelectionView.addColumn(i + 1, position.x, position.y);
		}
	}
	private static addColumn(num: number, x: number, y: number) {
		const editbox = BlzCreateFrame('EscMenuEditBoxTemplate', TeamSelectionView.backdrop, 0, num);
		BlzFrameSetPoint(editbox, FRAMEPOINT_TOPLEFT, TeamSelectionView.backdrop, FRAMEPOINT_TOPLEFT, x, y);
		BlzFrameSetSize(editbox, 0.1, 0.026);
		BlzFrameSetText(editbox, `Team #${num}`);
		BlzFrameSetTextSizeLimit(editbox, 16);
		BlzFrameSetEnable(editbox, false);

		const colorButton = BlzCreateFrameByType('GLUETEXTBUTTON', 'ColorButton', TeamSelectionView.backdrop, 'ScriptDialogButton', num);
		BlzFrameSetText(colorButton, 'Random Color');
		BlzFrameSetPoint(colorButton, FRAMEPOINT_TOP, editbox, FRAMEPOINT_BOTTOM, 0, 0);
		BlzFrameSetSize(colorButton, 0.1, 0.025);

		// Adjust Y position based on team number
		let topYPosition = TeamSelectionView.teamColumnPositions[num % 6].y; // Default to the top row in the same column

		// Special case for team 11
		if (num === 11) {
			topYPosition = TeamSelectionView.teamColumnPositions[0].y; // Move up to the first row's Y position
		}

		const colorFrame: framehandle = BlzCreateFrame('QuestButtonBaseTemplate', TeamSelectionView.backdrop, 0, num);
		BlzFrameSetPoint(colorFrame, FRAMEPOINT_TOP, TeamSelectionView.backdrop, FRAMEPOINT_TOPLEFT, x, topYPosition);
		BlzFrameSetSize(colorFrame, 0.1, 0.3); // Adjust size to fit all color options
		BlzFrameSetLevel(colorFrame, 999999);
		BlzFrameSetVisible(colorFrame, false);

		// Initialize color buttons map for the team
		TeamSelectionView.colorButtons.set(num, new Map<string, framehandle>());

		// Create Random Color button
		let previousButton: framehandle | null = null;
		TeamSelectionView.createColorButton(colorFrame, num, 'Random', '|cffffffff', previousButton);
		previousButton = BlzGetFrameByName(`ColorButton_Random`, 0);

		for (const [colorName, colorCode] of Object.entries(TeamSelectionView.colors)) {
			TeamSelectionView.createColorButton(colorFrame, num, colorName, colorCode, previousButton);
			previousButton = BlzGetFrameByName(`ColorButton_${colorName}`, 0);
		}

		const colorTrig: trigger = CreateTrigger();
		BlzTriggerRegisterFrameEvent(colorTrig, colorButton, FRAMEEVENT_CONTROL_CLICK);
		TriggerAddCondition(
			colorTrig,
			Condition(() => {
				const triggerPlayer: player = GetTriggerPlayer();

				if (TeamSelectionView.teams.get(num).captain == triggerPlayer) {
					if (GetLocalPlayer() == triggerPlayer) {
						BlzFrameSetVisible(colorFrame, !BlzFrameIsVisible(colorFrame));
					}
				}
			})
		);

		const joinButton = BlzCreateFrameByType('GLUETEXTBUTTON', 'TeamSlotButton', TeamSelectionView.backdrop, 'ScriptDialogButton', num);
		BlzFrameSetText(joinButton, 'Join Team');
		BlzFrameSetPoint(joinButton, FRAMEPOINT_TOP, colorButton, FRAMEPOINT_BOTTOM, 0, 0);
		BlzFrameSetSize(joinButton, 0.08, 0.025);

		const joinTrig: trigger = CreateTrigger();
		BlzTriggerRegisterFrameEvent(joinTrig, joinButton, FRAMEEVENT_CONTROL_CLICK);
		TriggerAddCondition(
			joinTrig,
			Condition(() => {
				const triggerPlayer: player = GetTriggerPlayer();
				TeamSelectionView.joinTeam(triggerPlayer, num);
			})
		);

		const teamsize: number = SettingsController.getInstance().getTeamSize();
		let initialOffset: number = -0.002;
		const offSetModifier: number = -0.015;

		const slots = [];
		for (let i = 0; i < teamsize; i++) {
			slots.push(false);
		}

		TeamSelectionView.teams.set(num, {
			players: new Set<player>(),
			slots: slots,
			captain: null,
			color: null,
		});

		for (let i = 0; i < teamsize; i++) {
			const slotNumber: number = i * 100 + num;
			const frame = BlzCreateFrameByType('TEXT', 'TeamSlot', TeamSelectionView.backdrop, '', slotNumber);
			BlzFrameSetPoint(frame, FRAMEPOINT_TOP, joinButton, FRAMEPOINT_BOTTOM, 0, initialOffset);
			BlzFrameSetText(frame, `-`);
			BlzFrameSetScale(frame, 1.1);

			initialOffset += offSetModifier;
		}
	}

	private static createColorButton(
		parentFrame: framehandle,
		teamNumber: number,
		colorName: string,
		colorCode: string,
		previousButton: framehandle | null
	) {
		const colorButton = BlzCreateFrameByType('GLUETEXTBUTTON', `ColorButton_${colorName}`, parentFrame, 'ScriptDialogButton', 0);
		BlzFrameSetText(colorButton, colorCode + colorName);
		BlzFrameSetSize(colorButton, 0.1, 0.025);

		if (previousButton) {
			BlzFrameSetPoint(colorButton, FRAMEPOINT_TOP, previousButton, FRAMEPOINT_BOTTOM, 0, 0.003);
		} else {
			BlzFrameSetPoint(colorButton, FRAMEPOINT_TOP, parentFrame, FRAMEPOINT_TOP, 0, 0);
		}

		const colorTrig: trigger = CreateTrigger();
		BlzTriggerRegisterFrameEvent(colorTrig, colorButton, FRAMEEVENT_CONTROL_CLICK);
		TriggerAddCondition(
			colorTrig,
			Condition(() => {
				const triggerPlayer: player = GetTriggerPlayer();

				if (TeamSelectionView.teams.get(teamNumber).captain == triggerPlayer) {
					if (GetLocalPlayer() == triggerPlayer) {
						// Update the team's color and close the menu
						TeamSelectionView.teams.get(teamNumber).color = colorCode;
						BlzFrameSetText(BlzGetFrameByName('ColorButton', teamNumber), colorCode + colorName);
						BlzFrameSetVisible(parentFrame, false);
					}
				}
			})
		);

		TeamSelectionView.colorButtons.get(teamNumber).set(colorName, colorButton);
	}

	private static joinTeam(player: player, teamNumber: number) {
		const playerData = TeamSelectionView.playerData.get(player);

		if (playerData && playerData.team != teamNumber) {
			const playerName = NameManager.getInstance().getAcct(player);

			// Close the color selection menu for the previous team if the player was the captain
			if (playerData.team != -1) {
				if (TeamSelectionView.teams.get(playerData.team)?.captain === player) {
					BlzFrameSetVisible(BlzGetFrameByName('QuestButtonBaseTemplate', playerData.team), false);
				}
				BlzFrameSetText(BlzGetFrameByName(`TeamSlot`, playerData.slot), `-`);
				TeamSelectionView.teams.get(playerData.team).slots[playerData.slot] = false;

				if (TeamSelectionView.teams.get(playerData.team)?.captain === player) {
					TeamSelectionView.reassignCaptain(playerData.team);
				}
			}

			const availableSlot = TeamSelectionView.findFirstAvailableSlot(teamNumber);

			if (availableSlot !== -1) {
				BlzFrameSetText(BlzGetFrameByName(`TeamSlot`, availableSlot), playerName);
				playerData.slot = availableSlot;
				playerData.team = teamNumber;
				TeamSelectionView.teams.get(teamNumber).slots[availableSlot] = true;

				if (!TeamSelectionView.teams.has(teamNumber)) {
					TeamSelectionView.teams.set(teamNumber, {
						players: new Set<player>(),
						slots: [],
						captain: null,
						color: null,
					});
				}

				TeamSelectionView.teams.get(teamNumber)?.players.add(player);

				if (TeamSelectionView.teams.get(teamNumber)?.captain === null) {
					TeamSelectionView.teams.get(teamNumber)!.captain = player;

					if (player == GetLocalPlayer()) {
						BlzFrameSetEnable(BlzGetFrameByName('EscMenuEditBoxTemplate', teamNumber), true);
					}
				}

				BlzFrameSetText(BlzGetFrameByName('PlayerList', playerData.bench), `-`);
				TeamSelectionView.bench.delete(player);
			} else {
				//TODO
			}
		}
	}

	private static leaveTeam(player: player) {
		const playerData = TeamSelectionView.playerData.get(player);

		if (playerData && playerData.team != -1) {
			BlzFrameSetText(BlzGetFrameByName(`TeamSlot`, playerData.slot), `-`);
			TeamSelectionView.teams.get(playerData.team).slots[playerData.slot] = false;
			BlzFrameSetText(BlzGetFrameByName('PlayerList', playerData.bench), `${NameManager.getInstance().getAcct(player)}`);
			TeamSelectionView.teams.get(playerData.team)?.players.delete(player);

			if (TeamSelectionView.teams.get(playerData.team)?.captain === player) {
				TeamSelectionView.reassignCaptain(playerData.team);
			}

			playerData.slot = -1;
			playerData.team = -1;
		}
	}

	private static reassignCaptain(teamNumber: number) {
		const teamData = TeamSelectionView.teams.get(teamNumber);
		if (teamData) {
			const previousCaptain = teamData.captain;
			const playersIterator = teamData.players.values();
			const newCaptain = playersIterator.next().value || null;
			teamData.captain = newCaptain;

			if (previousCaptain && previousCaptain == GetLocalPlayer()) {
				BlzFrameSetEnable(BlzGetFrameByName('EscMenuEditBoxTemplate', teamNumber), false);
			}

			if (newCaptain && newCaptain == GetLocalPlayer()) {
				BlzFrameSetEnable(BlzGetFrameByName('EscMenuEditBoxTemplate', teamNumber), true);
			}
		}
	}

	private static findFirstAvailableSlot(teamNumber: number): number {
		const teamData = TeamSelectionView.teams.get(teamNumber);

		if (teamData?.slots) {
			for (let i = 0; i < teamData.slots.length; i++) {
				if (!teamData.slots[i]) {
					return i * 100 + teamNumber;
				}
			}
		}
		return -1;
	}

	public static update() {
		const event = EventTimer.getInstance().getEvent('uiTimer');
		BlzFrameSetText(BlzGetFrameByName('TeamSelectionTimer', 0), I2S(event.duration));
	}

	public static hide() {
		BlzFrameSetEnable(TeamSelectionView.backdrop, false);
		BlzFrameSetVisible(TeamSelectionView.backdrop, false);
		TeamSelectionView.bench.clear();
	}
}
