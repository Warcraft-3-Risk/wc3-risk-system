import { ActivePlayer } from '../player/types/active-player';
import { HexColors } from '../utils/hex-colors';

export type ButtonConfig = {
	active: boolean;
	player: ActivePlayer;
	createContext: number;
	key: oskeytype;
	textures: {
		active: string, disabled: string
	};
	xOffset: number;
	action: (context: number, texture: {
		active: string, disabled: string
	}, active: boolean) => void;
};

export function createUnitLagButton(config: ButtonConfig): framehandle {
	const button = BlzCreateFrameByType(
		'BUTTON',
		'UnitLagButton',
		BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0),
		'ScoreScreenTabButtonTemplate',
		config.createContext
	);

	const buttonIconFrame = BlzCreateFrameByType('BACKDROP', 'UnitLagButtonBackdrop', button, '', config.createContext);

	BlzFrameSetAllPoints(buttonIconFrame, button);
	BlzFrameSetPoint(button, FRAMEPOINT_TOPLEFT, BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0), FRAMEPOINT_TOPLEFT, config.xOffset, -0.025);
	BlzFrameSetSize(button, 0.02, 0.02);
	BlzFrameSetTexture(buttonIconFrame, config.textures.active, 0, true);

	const tooltipFrame = BlzCreateFrame(
		'EscMenuControlBackdropTemplate',
		BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0),
		0,
		config.createContext
	);

	BlzFrameSetTooltip(button, tooltipFrame);

	const tooltipText = BlzCreateFrameByType('TEXT', 'UnitLagButtonTooltip', tooltipFrame, '', config.createContext);

	BlzFrameSetSize(tooltipText, 0.15, 0);
	BlzFrameSetPoint(tooltipFrame, FRAMEPOINT_BOTTOMLEFT, tooltipText, FRAMEPOINT_BOTTOMLEFT, -0.01, -0.01);
	BlzFrameSetPoint(tooltipFrame, FRAMEPOINT_TOPRIGHT, tooltipText, FRAMEPOINT_TOPRIGHT, 0.01, 0.01);

	BlzFrameSetPoint(tooltipText, FRAMEPOINT_TOPLEFT, button, FRAMEPOINT_BOTTOMLEFT, 0, -0.01);
	BlzFrameSetEnable(tooltipText, true);

	BlzFrameSetText(
		tooltipText,
		`Stop All ${HexColors.TANGERINE}(F2)|r\nStops all of your units immediately.`
	);

	const hotkeyTrigger = CreateTrigger();

	BlzTriggerRegisterPlayerKeyEvent(hotkeyTrigger, config.player.getPlayer(), config.key, 0, false);
	TriggerAddCondition(
		hotkeyTrigger,
		Condition(() => config.action(config.createContext, config.textures, BlzFrameGetEnable(tooltipText)))
	);

	const buttonTrig = CreateTrigger();

	BlzTriggerRegisterFrameEvent(hotkeyTrigger, button, FRAMEEVENT_CONTROL_CLICK);
	TriggerAddCondition(
		buttonTrig,
		Condition(() => config.action(config.createContext, config.textures, BlzFrameGetEnable(tooltipText)))
	);

	BlzFrameSetVisible(button, false);

	if (GetLocalPlayer() == config.player.getPlayer()) {
		BlzFrameSetVisible(button, true);
	}

	return button;
}
