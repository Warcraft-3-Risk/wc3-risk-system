import { EDITOR_DEVELOPER_MODE, SHOW_PLAYER_CAMERA_POSITIONS } from 'src/configs/game-settings';
import { ActivePlayer } from '../player/types/active-player';
import { CAMERA_POSITION_MODE, CAMERA_POSITION_MODE_LABELS, CameraPositionMode, nextCameraPositionMode } from '../player/options';
import { HexColors } from '../utils/hex-colors';
import { RATING_STATS_BUTTON_X_OFFSET } from './player-preference-buttons';

const BUTTON_CONTEXT_OFFSET: number = 400;
// Observers have no other buttons, so theirs sits in the leftmost player button slot. Players only get
// it in developer mode, where it goes one slot right of their last button (ranked stats).
const OBSERVER_BUTTON_X_OFFSET: number = 0.0;
const PLAYER_BUTTON_X_OFFSET: number = RATING_STATS_BUTTON_X_OFFSET + 0.023;
// The leftmost slot sits on the screen edge, so its tooltip is nudged right to keep the backdrop on
// screen - the same offset the guard health button (which shares that slot) uses.
const OBSERVER_TOOLTIP_X_OFFSET: number = 0.015;
const PLAYER_TOOLTIP_X_OFFSET: number = 0.0;
const BUTTON_SIZE: number = 0.02;
const OBSERVER_HOVER_POLL_INTERVAL: number = 1.0;

const TEXTURE_ENABLED: string = 'ReplaceableTextures\\CommandButtons\\BTNTelescope.blp';
const TEXTURE_DISABLED: string = 'ReplaceableTextures\\CommandButtonsDisabled\\DISBTNTelescope.blp';

/**
 * Cycles the "where is everyone looking" overlay between its three modes.
 *
 * Observers cannot click frames in the normal way, so for them the click is backed up by a hover:
 * a poll on the observer's own client cycles the mode while the button's tooltip is showing.
 *
 * @returns The icon frame, which is the button's root - hiding it hides the whole button.
 */
export function buildCameraPositionButton(player: ActivePlayer): framehandle | undefined {
	if (!SHOW_PLAYER_CAMERA_POSITIONS) return undefined;

	const handle: player = player.getPlayer();

	// Only observers (or any player in developer mode) can use the overlay. This check is the same on
	// every client, so every client creates the exact same frames, trigger and timer below. Creating
	// them only on the client that can see the button made handle ids drift apart and desynced the game.
	if (!IsPlayerObserver(handle) && !EDITOR_DEVELOPER_MODE) return undefined;

	const isLocal: boolean = GetLocalPlayer() === handle;
	const context: number = GetPlayerId(handle) + BUTTON_CONTEXT_OFFSET;
	const gameUI: framehandle = BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0);

	const icon: framehandle = BlzCreateFrameByType('BACKDROP', 'CameraPositionButtonBackdrop', gameUI, '', context);
	const xOffset: number = IsPlayerObserver(handle) ? OBSERVER_BUTTON_X_OFFSET : PLAYER_BUTTON_X_OFFSET;
	BlzFrameSetPoint(icon, FRAMEPOINT_TOPLEFT, gameUI, FRAMEPOINT_TOPLEFT, xOffset, -0.025);
	BlzFrameSetSize(icon, BUTTON_SIZE, BUTTON_SIZE);

	const button: framehandle = BlzCreateFrameByType('GLUETEXTBUTTON', 'CameraPositionButton', icon, 'ScriptDialogButton', context);
	BlzFrameSetAllPoints(button, icon);
	BlzFrameSetText(button, '');
	BlzFrameSetAlpha(button, 0);

	const tooltipFrame: framehandle = BlzCreateFrame('EscMenuControlBackdropTemplate', gameUI, 0, context);
	const tooltipText: framehandle = BlzCreateFrameByType('TEXT', 'CameraPositionButtonToolTip', tooltipFrame, '', context);

	BlzFrameSetTooltip(button, tooltipFrame);
	BlzFrameSetSize(tooltipText, 0.15, 0);
	BlzFrameSetTextAlignment(tooltipText, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
	BlzFrameSetPoint(tooltipFrame, FRAMEPOINT_BOTTOMLEFT, tooltipText, FRAMEPOINT_BOTTOMLEFT, -0.012, -0.01);
	BlzFrameSetPoint(tooltipFrame, FRAMEPOINT_TOPRIGHT, tooltipText, FRAMEPOINT_TOPRIGHT, 0.012, 0.01);
	const tooltipXOffset: number = IsPlayerObserver(handle) ? OBSERVER_TOOLTIP_X_OFFSET : PLAYER_TOOLTIP_X_OFFSET;
	BlzFrameSetPoint(tooltipText, FRAMEPOINT_TOPLEFT, icon, FRAMEPOINT_BOTTOMLEFT, tooltipXOffset, -0.01);
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

	// The mode only drives the local overlay rendering, never synced logic, so it is safe for the
	// observer hover path below to change it on the observer's client alone.
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
			if (GetTriggerPlayer() === handle) cycle();
			return false;
		})
	);

	// Observers get the hover fallback, since clicks never reach them. The game shows the button's
	// tooltip while the mouse is over it, so its visibility doubles as a hover check. Deliberately not
	// CreateObserverButton: that polls the button's highlight child through BlzFrameGetChild on every
	// client, and the highlight only exists once the button has been hovered - so from the first hover
	// on, only the observer's client gets a handle back and the handle ids drift apart (desync).
	// BlzFrameIsVisible on the tooltip frame, which every client created above, allocates nothing.
	if (IsPlayerObserver(handle)) {
		TimerStart(CreateTimer(), OBSERVER_HOVER_POLL_INTERVAL, true, () => {
			if (GetLocalPlayer() !== handle) return;
			if (BlzFrameIsVisible(tooltipFrame)) cycle();
		});
	}

	render();

	// Everyone builds the button, but only its owner ever sees it.
	BlzFrameSetVisible(icon, isLocal);

	return icon;
}
