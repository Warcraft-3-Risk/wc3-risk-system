import { MAP_VERSION, W3C_MODE_ENABLED } from '../utils/map-info';

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

	for (let i = 0; i < bj_MAX_PLAYERS; i++) {
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

	for (let i = 0; i < bj_MAX_PLAYERS; i++) {
		const player = Player(i);

		if (IsPlayerObserver(player)) continue;

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
		// Get all Frames outside of local scope to prevent async issues
		const escMenuSaveLoadContainer: framehandle = BlzGetFrameByName('EscMenuSaveLoadContainer', 0);
		const saveGameFileEditBox: framehandle = BlzGetFrameByName('SaveGameFileEditBox', 0);
		const exitButton: framehandle = BlzGetFrameByName('ExitButton', 0);
		const confirmQuitQuitButton: framehandle = BlzGetFrameByName('ConfirmQuitQuitButton', 0);
		const confirmQuitMessageText: framehandle = BlzGetFrameByName('ConfirmQuitMessageText', 0);

		if (!IsPlayerObserver(GetLocalPlayer())) {
			BlzFrameSetVisible(escMenuSaveLoadContainer, false);
			BlzFrameSetEnable(saveGameFileEditBox, false);
			BlzFrameSetVisible(exitButton, false);
			BlzFrameSetEnable(confirmQuitQuitButton, false);
			BlzFrameSetText(confirmQuitMessageText, 'Please use Quit Mission instead.');
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
	tempText += '|n|cffffffff-help - Display full command list';
	tempText += '|n|cffffffff-tutorial - Quick tutorial on how to play';
	tempText += '|n|cffffffff-advanced - Advanced gameplay tips and tricks';
	tempText += '|n|cffffffff-cam #### - Set camera distance (1000 min, 8500 max)';
	tempText += '|n|cffffffff-ff - Forfeit the game without leaving it';
	tempText += '|n|cffffffff-ng - Restart the game when it is over';
	tempText += '|n|cffffffff-names - Display a list of alive/nomad players';
	tempText += '|n|cffffffff-allies - Show your allies (team modes only)';
	tempText += '|n|cffffffff-gold <player> <amount> - Send gold to allies (team modes)';
	tempText += '|n|cffffffff-mute <player> - Mute a dead player for 300 seconds';
	tempText += '|n|cffffffff-ui - Toggle UI buttons visibility';
	tempText += '|n|n|cffffcc00Hotkeys:|r';
	tempText += '|n|cffffffff F4 - Toggle rating stats window';
	tempText += '|n|cffffffff F6 - Toggle guard health preference';
	tempText += '|n|cffffffff F7 - Toggle guard value preference';
	tempText += '|n|cffffffff F8 - Toggle country labels';

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
