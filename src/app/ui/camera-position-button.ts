import { EDITOR_DEVELOPER_MODE, SHOW_PLAYER_CAMERA_POSITIONS } from 'src/configs/game-settings';
import { File } from 'w3ts';
import { ActivePlayer } from '../player/types/active-player';
import { canUseAllyCameras } from '../utils/ally-cameras';
import { CAMERA_POSITION_MODE, CAMERA_POSITION_MODE_LABELS, CameraPositionMode, nextCameraPositionMode } from '../player/options';
import { HexColors } from '../utils/hex-colors';
import { RATING_STATS_BUTTON_X_OFFSET } from './player-preference-buttons';

const BUTTON_CONTEXT_OFFSET: number = 400;
// Players and observers keep separate preferences, so a mode chosen in a team game does not carry
// over into observing (where it would show every player's camera) and vice versa.
const PLAYER_PREFERENCE_FILE: string = 'risk/camPos.pld';
const OBSERVER_PREFERENCE_FILE: string = 'risk/camPosObs.pld';
// Observers have no other buttons, so theirs sits in the leftmost player button slot. Players get it
// in team games (and in developer mode), one slot right of their last button (ranked stats).
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

// Every client builds every button, so this map holds the same frames on every client.
const cameraButtons: Map<player, framehandle> = new Map<player, framehandle>();

/**
 * Whether the player can use the camera overlay in the current match: observers and developer mode
 * always, players only in team games where they have an ally. Never true for a player in FFA.
 */
export function isCameraPositionButtonAvailable(p: player): boolean {
	if (!SHOW_PLAYER_CAMERA_POSITIONS) return false;
	if (IsPlayerObserver(p) || EDITOR_DEVELOPER_MODE) return true;

	return canUseAllyCameras(p);
}

/**
 * Shows or hides the local player's camera button for the current match. Called from SetupState once
 * the match's teams and alliances are set, so it is re-evaluated on every match.
 * Respects -ui: if the player has hidden their buttons, the camera button stays hidden too.
 */
export function refreshCameraPositionButtons(): void {
	cameraButtons.forEach((icon, handle) => {
		if (GetLocalPlayer() !== handle) return;
		if (IsPlayerObserver(handle)) return;

		const uiVisible: boolean = BlzFrameIsVisible(BlzGetFrameByName('GuardButton', GetPlayerId(handle)));

		BlzFrameSetVisible(icon, uiVisible && isCameraPositionButtonAvailable(handle));
	});
}

function loadSavedMode(file: string): CameraPositionMode {
	const saved: number = S2I(File.read(file) ?? '');

	if (saved === CAMERA_POSITION_MODE.MINIMAP_ONLY || saved === CAMERA_POSITION_MODE.WORLD_AND_MINIMAP) return saved;

	return CAMERA_POSITION_MODE.DISABLED;
}

/**
 * Cycles the "where is everyone looking" overlay between its three modes.
 * Observers see every player's camera; players in team games see their allies' cameras.
 * The chosen mode is saved locally and restored next game.
 *
 * Observers cannot click frames in the normal way, so for them the click is backed up by a hover:
 * a poll on the observer's own client cycles the mode while the button's tooltip is showing.
 *
 * @returns The icon frame, which is the button's root - hiding it hides the whole button.
 */
export function buildCameraPositionButton(player: ActivePlayer): framehandle | undefined {
	if (!SHOW_PLAYER_CAMERA_POSITIONS) return undefined;

	const handle: player = player.getPlayer();

	// Built for every observer and player on every client, so every client creates the exact same
	// frames, trigger and timer below. Creating them only on the client that can see the button made
	// handle ids drift apart and desynced the game. Whether a player may actually use it (team game
	// with allies) is only known after mode selection - see refreshCameraPositionButtons().
	const isObserver: boolean = IsPlayerObserver(handle);
	const isLocal: boolean = GetLocalPlayer() === handle;
	const preferenceFile: string = isObserver ? OBSERVER_PREFERENCE_FILE : PLAYER_PREFERENCE_FILE;

	// Purely local preference - it only ever drives the local overlay rendering
	if (isLocal) player.options.cameraPositionMode = loadSavedMode(preferenceFile);

	const context: number = GetPlayerId(handle) + BUTTON_CONTEXT_OFFSET;
	const gameUI: framehandle = BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0);

	const icon: framehandle = BlzCreateFrameByType('BACKDROP', 'CameraPositionButtonBackdrop', gameUI, '', context);
	const xOffset: number = isObserver ? OBSERVER_BUTTON_X_OFFSET : PLAYER_BUTTON_X_OFFSET;
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
	const tooltipXOffset: number = isObserver ? OBSERVER_TOOLTIP_X_OFFSET : PLAYER_TOOLTIP_X_OFFSET;
	BlzFrameSetPoint(tooltipText, FRAMEPOINT_TOPLEFT, icon, FRAMEPOINT_BOTTOMLEFT, tooltipXOffset, -0.01);
	BlzFrameSetEnable(tooltipText, false);

	const render = (): void => {
		if (GetLocalPlayer() !== handle) return;

		const mode: CameraPositionMode = player.options.cameraPositionMode;
		const color: string = mode === CAMERA_POSITION_MODE.DISABLED ? HexColors.RED : HexColors.GREEN;
		const title: string = isObserver ? 'Player Camera Positions' : 'Ally Camera Positions';
		const description: string = isObserver ? 'Shows where other players are currently looking.' : 'Shows where your allies are currently looking.';

		BlzFrameSetTexture(icon, mode === CAMERA_POSITION_MODE.DISABLED ? TEXTURE_DISABLED : TEXTURE_ENABLED, 0, true);
		BlzFrameSetText(tooltipText, `${title}|r\n${description}\nCurrent preference: ${color}${CAMERA_POSITION_MODE_LABELS[mode]}`);
	};

	// The mode only drives the local overlay rendering, never synced logic, so it is safe for the
	// observer hover path below to change it on the observer's client alone.
	const cycle = (): void => {
		player.options.cameraPositionMode = nextCameraPositionMode(player.options.cameraPositionMode);
		if (GetLocalPlayer() === handle) File.write(preferenceFile, `${player.options.cameraPositionMode}`);
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
	if (isObserver) {
		TimerStart(CreateTimer(), OBSERVER_HOVER_POLL_INTERVAL, true, () => {
			if (GetLocalPlayer() !== handle) return;
			if (BlzFrameIsVisible(tooltipFrame)) cycle();
		});
	}

	render();

	// Everyone builds the button, but only its owner ever sees it. Players start hidden; the match
	// setup reveals it in team games (refreshCameraPositionButtons).
	BlzFrameSetVisible(icon, isLocal && (isObserver || EDITOR_DEVELOPER_MODE));

	cameraButtons.set(handle, icon);

	return icon;
}
