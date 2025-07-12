import { MAP_VERSION, W3C_MODE_ENABLED } from '../utils/map-info';
import { PLAYER_SLOTS } from '../utils/utils';

/**
 * Sets up the console UI for the game.
 */
export function SetConsoleUI() {
	// Disable Resource Tooltips
	const resourceFrame: framehandle = BlzGetFrameByName('ResourceBarFrame', 0);
	BlzFrameSetVisible(BlzFrameGetChild(resourceFrame, 1), false); // lumber tooltip
	BlzFrameSetVisible(BlzFrameGetChild(resourceFrame, 2), false); // upkeep tooltip
	BlzFrameSetVisible(BlzFrameGetChild(resourceFrame, 3), false); // supply tooltip

	// Reposition Resource Frames
	const upkeepFrame: framehandle = BlzGetFrameByName('ResourceBarUpkeepText', 0);
	BlzFrameSetAbsPoint(upkeepFrame, FRAMEPOINT_TOPRIGHT, 0.6485, 0.5972);
	BlzFrameSetText(upkeepFrame, '');

	const lumberFrame: framehandle = BlzGetFrameByName('ResourceBarLumberText', 0);
	BlzFrameSetText(lumberFrame, '');
	BlzFrameSetSize(lumberFrame, 0.0000001, 0.0000001);

	const mapInfo: framehandle = BlzCreateFrameByType(
		'TEXT',
		'mapInfo',
		BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0),
		'EscMenuLabelTextTemplate',
		0
	);
	BlzFrameSetPoint(mapInfo, FRAMEPOINT_LEFT, BlzGetFrameByName('ResourceBarSupplyText', 0), FRAMEPOINT_RIGHT, 0.035, 0.0);
	BlzFrameSetTextAlignment(mapInfo, TEXT_JUSTIFY_CENTER, TEXT_JUSTIFY_RIGHT);
	BlzFrameSetLevel(mapInfo, 2);
	BlzFrameSetText(mapInfo, `v${MAP_VERSION}`);

	const newTitle: string = 'discord.gg/wc3risk';
	const newResourceHeader: string = 'www.youtube.com/@riskreforged';

	BlzFrameSetText(BlzGetFrameByName('AllianceTitle', 0), newTitle);
	BlzFrameSetText(BlzGetFrameByName('ResourceTradingTitle', 0), newResourceHeader);

	BlzFrameSetVisible(BlzGetFrameByName('VisionHeader', 0), false);
	BlzFrameSetVisible(BlzGetFrameByName('LumberHeader', 0), false);
	BlzFrameSetVisible(BlzGetFrameByName('AlliedVictoryLabel', 0), false);
	BlzFrameSetVisible(BlzGetFrameByName('AlliedVictoryCheckBox', 0), false);

	for (let i = 0; i < 23; i++) {
		BlzFrameSetVisible(BlzGetFrameByName('LumberBackdrop', i), false);
		BlzFrameSetVisible(BlzGetFrameByName('LumberText', i), false);
		BlzFrameSetVisible(BlzGetFrameByName('VisionCheckBox', i), false);
	}

	if (GetHandleId(BlzGetFrameByName('ChatPlayerLabel', 0)) == 0) {
		Location(0, 0);
	} else {
		BlzFrameSetVisible(BlzGetFrameByName('ChatPlayerLabel', 0), false);
	}

	if (GetHandleId(BlzGetFrameByName('ChatPlayerRadioButton', 0)) == 0) {
		Location(0, 0);
	} else {
		BlzFrameSetVisible(BlzGetFrameByName('ChatPlayerRadioButton', 0), false);
	}

	if (GetHandleId(BlzGetFrameByName('ChatPlayerMenu', 0)) == 0) {
		Location(0, 0);
	} else {
		BlzFrameSetVisible(BlzGetFrameByName('ChatPlayerMenu', 0), false);
	}

	BlzCreateFrame('GlobalMessageFrame', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);
	BlzCreateFrame('CountdownFrame', BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), 0, 0);

	for (let i = 0; i < PLAYER_SLOTS; i++) {
		const player = Player(i);

		if (GetPlayerController(player) == MAP_CONTROL_USER) {
			const errorFrame: framehandle = BlzCreateFrame(
				'ErrorMessageFrame',
				BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0),
				0,
				GetPlayerId(player)
			);

			BlzFrameSetVisible(errorFrame, false);

			const localMsgFrame: framehandle = BlzCreateFrame(
				'LocalMessageFrame',
				BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0),
				0,
				GetPlayerId(player)
			);

			BlzFrameSetVisible(localMsgFrame, false);
			if (player == GetLocalPlayer()) {
				BlzFrameSetVisible(errorFrame, true);
				BlzFrameSetVisible(localMsgFrame, true);
			}
		}
	}

	BlzFrameClick(BlzGetFrameByName('UpperButtonBarQuestsButton', 0));
	BlzFrameClick(BlzGetFrameByName('QuestAcceptButton', 0));
	BlzFrameSetSize(BlzGetFrameByName('QuestItemListContainer', 0), 0.01, 0.01);
	BlzFrameSetSize(BlzGetFrameByName('QuestItemListScrollBar', 0), 0.001, 0.001);

	// Disable exit button for W3C mode
	if (W3C_MODE_ENABLED) {
		if (!IsPlayerObserver(GetLocalPlayer())) {
			BlzFrameSetVisible(BlzGetFrameByName('EscMenuSaveLoadContainer', 0), false);
			BlzFrameSetEnable(BlzGetFrameByName('SaveGameFileEditBox', 0), false);
			BlzFrameSetVisible(BlzGetFrameByName('ExitButton', 0), false);
			BlzFrameSetEnable(BlzGetFrameByName('ConfirmQuitQuitButton', 0), false);
			BlzFrameSetText(BlzGetFrameByName('ConfirmQuitMessageText', 0), 'Please use Quit Mission instead.');
		}
	}
}

/**
 * Sets up the Ally Menu for Free-for-All game mode.
 */
export function AllyMenuFFASetup() {
	let AllyMenuTitle: framehandle = BlzGetFrameByName('AllianceTitle', 0);
	let tempText: string = 'discord.me/risk';
	tempText += '|n|n|cffffcc00Commands:|r';
	tempText += '|n|cffffffff-cam OR -zoom #### (1000 min, 8500 max)';
	tempText += '|n|cffffffff-ff (forfeits the game without leaving it)';
	tempText += '|n|cffffffff-ng (restarts the game if its over)';
	tempText += '|n|cffffffff-names displays a list of alive/nomad players in game';
	tempText += '|n|cffffffff-stfu <player name/color> (mutes a player for 300 seconds)';
	tempText += '|n|n|cffffcc00Hotkeys:|r';
	tempText += '|n|cffffffff F1 (selects player tools)';
	tempText += '|n|cffffffff F7 (cycles scoreboard)';
	tempText += '|n|cffffffff F8 (cycles owned spawners)';

	BlzFrameSetText(AllyMenuTitle, tempText);

	BlzFrameSetVisible(BlzGetFrameByName('UnitsHeader', 0), false);
	BlzFrameSetVisible(BlzGetFrameByName('AllyHeader', 0), false);
	BlzFrameSetVisible(BlzGetFrameByName('GoldHeader', 0), false);
	BlzFrameSetVisible(BlzGetFrameByName('AllianceDialogScrollBar', 0), false);
	BlzFrameSetVisible(BlzGetFrameByName('AllianceAcceptButton', 0), false);
	BlzFrameSetVisible(BlzGetFrameByName('AllianceAcceptButtonText', 0), false);
	BlzFrameSetVisible(BlzGetFrameByName('PlayersHeader', 0), false);

	for (let i = 0; i < 23; i++) {
		BlzFrameSetVisible(BlzGetFrameByName('AllianceSlot', i), false);
		BlzFrameSetVisible(BlzGetFrameByName('PlayerNameLabel', i), false);
		BlzFrameSetVisible(BlzGetFrameByName('ColorBackdrop', i), false);
		BlzFrameSetVisible(BlzGetFrameByName('ColorBorder', i), false);
		BlzFrameSetVisible(BlzGetFrameByName('AllyCheckBox', i), false);
		BlzFrameSetVisible(BlzGetFrameByName('GoldBackdrop', i), false);
		BlzFrameSetVisible(BlzGetFrameByName('GoldText', i), false);
		BlzFrameSetVisible(BlzGetFrameByName('UnitsCheckBox', i), false);
		BlzFrameSetVisible(BlzGetFrameByName('PlayerBanner', i), false);
	}
}
