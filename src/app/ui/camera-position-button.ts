import { EDITOR_DEVELOPER_MODE, SHOW_PLAYER_CAMERA_POSITIONS } from 'src/configs/game-settings';
import { ActivePlayer } from '../player/types/active-player';
import { CAMERA_POSITION_MODE, CAMERA_POSITION_MODE_LABELS, CameraPositionMode, nextCameraPositionMode } from '../player/options';
import { HexColors } from '../utils/hex-colors';
import { CreateObserverButton } from '../utils/observer-helper';

const BUTTON_CONTEXT_OFFSET: number = 400;
const BUTTON_X_OFFSET: number = 0.092;
const BUTTON_SIZE: number = 0.02;

const TEXTURE_ENABLED: string = 'ReplaceableTextures\\CommandButtons\\BTNTelescope.blp';
const TEXTURE_DISABLED: string = 'ReplaceableTextures\\CommandButtonsDisabled\\DISBTNTelescope.blp';

/**
 * Cycles the "where is everyone looking" overlay between its three modes.
 *
 * Observers cannot click frames in the normal way, so the click path is backed up by
 * CreateObserverButton, which polls the button's tooltip child and fires on hover instead.
 */
export function buildCameraPositionButton(player: ActivePlayer): framehandle | undefined {
	if (!SHOW_PLAYER_CAMERA_POSITIONS) return undefined;

	const handle: player = player.getPlayer();

	// Purely local UI, so only build it on the client that can actually use it:
	// an observer, or any player while developer mode is on.
	if (GetLocalPlayer() !== handle) return undefined;
	if (!IsPlayerObserver(handle) && !EDITOR_DEVELOPER_MODE) return undefined;
	const context: number = GetPlayerId(handle) + BUTTON_CONTEXT_OFFSET;
	const gameUI: framehandle = BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0);

	const button: framehandle = BlzCreateFrameByType('BUTTON', 'CameraPositionButton', gameUI, 'ScoreScreenTabButtonTemplate', context);
	const icon: framehandle = BlzCreateFrameByType('BACKDROP', 'CameraPositionButtonBackdrop', button, '', context);

	BlzFrameSetAllPoints(icon, button);
	BlzFrameSetPoint(button, FRAMEPOINT_TOPLEFT, gameUI, FRAMEPOINT_TOPLEFT, BUTTON_X_OFFSET, -0.025);
	BlzFrameSetSize(button, BUTTON_SIZE, BUTTON_SIZE);

	const tooltipFrame: framehandle = BlzCreateFrame('EscMenuControlBackdropTemplate', gameUI, 0, context);
	const tooltipText: framehandle = BlzCreateFrameByType('TEXT', 'CameraPositionButtonToolTip', tooltipFrame, '', context);

	BlzFrameSetTooltip(button, tooltipFrame);
	BlzFrameSetSize(tooltipText, 0.15, 0);
	BlzFrameSetTextAlignment(tooltipText, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
	BlzFrameSetPoint(tooltipFrame, FRAMEPOINT_BOTTOMLEFT, tooltipText, FRAMEPOINT_BOTTOMLEFT, -0.012, -0.01);
	BlzFrameSetPoint(tooltipFrame, FRAMEPOINT_TOPRIGHT, tooltipText, FRAMEPOINT_TOPRIGHT, 0.012, 0.01);
	BlzFrameSetPoint(tooltipText, FRAMEPOINT_TOPLEFT, button, FRAMEPOINT_BOTTOMLEFT, 0, -0.01);
	BlzFrameSetEnable(tooltipText, false);

	const render = (): void => {
		if (GetLocalPlayer() !== handle) return;

		const mode: CameraPositionMode = player.options.cameraPositionMode;
		const color: string = mode === CAMERA_POSITION_MODE.DISABLED ? HexColors.RED : HexColors.GREEN;

		BlzFrameSetTexture(icon, mode === CAMERA_POSITION_MODE.DISABLED ? TEXTURE_DISABLED : TEXTURE_ENABLED, 0, true);
		BlzFrameSetText(
			tooltipText,
			`Player Camera Positions|r\nShows where other players are currently looking.\nCurrent preference: ${color}${CAMERA_POSITION_MODE_LABELS[mode]}`
		);
	};

	const cycle = (): void => {
		player.options.cameraPositionMode = nextCameraPositionMode(player.options.cameraPositionMode);
		render();

		// Re-arm the frame so a held hover does not immediately cycle again on the next poll.
		BlzFrameSetEnable(button, false);
		BlzFrameSetEnable(button, true);
	};

	const clickTrigger: trigger = CreateTrigger();
	BlzTriggerRegisterFrameEvent(clickTrigger, button, FRAMEEVENT_CONTROL_CLICK);
	TriggerAddCondition(
		clickTrigger,
		Condition(() => {
			cycle();
			return false;
		})
	);

	// Observers get the hover fallback, since clicks never reach them.
	CreateObserverButton(button, IsPlayerObserver(handle), cycle);

	render();

	BlzFrameSetVisible(button, true);

	return button;
}
