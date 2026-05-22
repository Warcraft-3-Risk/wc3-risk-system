import { EDITOR_DEVELOPER_MODE } from 'src/configs/game-settings';
import { CameraDistanceModeManager } from '../../managers/camera-distance-mode-manager';
import { getCameraDistanceModeText } from '../../ui/camera-distance-mode';
import { CreateObserverButton } from '../../utils/observer-helper';

export class ObserverCameraDistanceMode {
	private static instance: ObserverCameraDistanceMode;
	private toggleButton: framehandle;
	private toggleIcon: framehandle;
	private tooltipTextFrame: framehandle;

	private constructor() {
		this.createToggleButton();
		this.refreshIcon();
	}

	public static getInstance(): ObserverCameraDistanceMode {
		if (!this.instance) {
			this.instance = new ObserverCameraDistanceMode();
		}
		return this.instance;
	}

	public updateEligibility(): void {
		const localPlayer = GetLocalPlayer();

		BlzFrameSetVisible(this.toggleButton, false);
		BlzFrameSetVisible(this.toggleIcon, false);
		if (IsPlayerObserver(localPlayer) || EDITOR_DEVELOPER_MODE) {
			BlzFrameSetVisible(this.toggleButton, true);
			BlzFrameSetVisible(this.toggleIcon, true);
		} else {
			BlzFrameSetEnable(this.toggleButton, false);
		}
	}

	private createToggleButton(): void {
		const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0);
		const ctx = 900;

		this.toggleIcon = BlzCreateFrameByType('BACKDROP', 'ObserverCameraDistanceModeIcon', gameUI, '', ctx);
		BlzFrameSetPoint(this.toggleIcon, FRAMEPOINT_TOPLEFT, gameUI, FRAMEPOINT_TOPLEFT, 0.184, -0.025);
		BlzFrameSetSize(this.toggleIcon, 0.02, 0.02);
		BlzFrameSetTexture(this.toggleIcon, 'ReplaceableTextures\\CommandButtons\\BTNTelescope.blp', 0, true);

		this.toggleButton = BlzCreateFrameByType('GLUETEXTBUTTON', 'ObserverCameraDistanceModeButton', gameUI, 'ScriptDialogButton', ctx);
		BlzFrameSetPoint(this.toggleButton, FRAMEPOINT_TOPLEFT, gameUI, FRAMEPOINT_TOPLEFT, 0.184, -0.025);
		BlzFrameSetSize(this.toggleButton, 0.02, 0.02);
		BlzFrameSetText(this.toggleButton, '');
		BlzFrameSetAlpha(this.toggleButton, 0);
		this.createTooltip();

		const clickTrigger = CreateTrigger();
		BlzTriggerRegisterFrameEvent(clickTrigger, this.toggleButton, FRAMEEVENT_CONTROL_CLICK);
		TriggerAddAction(clickTrigger, () => this.cycleMode());

		const localPlayer = GetLocalPlayer();
		CreateObserverButton(this.toggleButton, IsPlayerObserver(localPlayer), () => this.cycleMode());

		this.updateEligibility();
	}

	private cycleMode(): void {
		CameraDistanceModeManager.getInstance().cycleMode();
		this.refreshIcon();

		BlzFrameSetEnable(this.toggleButton, false);
		BlzFrameSetEnable(this.toggleButton, true);
	}

	private refreshIcon(): void {
		const mode = CameraDistanceModeManager.getInstance().getMode();
		const alpha = mode === 'close' ? 150 : mode === 'medium' ? 210 : 255;
		const tooltip = `Camera Distance\nCycles ${getCameraDistanceModeText(mode)} mode.\nPattern: Close → Medium → Far → Medium → Close`;

		BlzFrameSetAlpha(this.toggleIcon, alpha);
		BlzFrameSetText(this.toggleButton, '');
		BlzFrameSetText(this.tooltipTextFrame, tooltip);
	}

	private createTooltip(): void {
		const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0);
		const tooltipFrame = BlzCreateFrame('EscMenuControlBackdropTemplate', gameUI, 0, 901);
		const tooltipText = BlzCreateFrameByType('TEXT', 'ObserverCameraDistanceModeTooltipText', tooltipFrame, '', 901);

		BlzFrameSetSize(tooltipText, 0.18, 0);
		BlzFrameSetTextAlignment(tooltipText, TEXT_JUSTIFY_LEFT, TEXT_JUSTIFY_TOP);
		BlzFrameSetPoint(tooltipFrame, FRAMEPOINT_BOTTOMLEFT, tooltipText, FRAMEPOINT_BOTTOMLEFT, -0.012, -0.01);
		BlzFrameSetPoint(tooltipFrame, FRAMEPOINT_TOPRIGHT, tooltipText, FRAMEPOINT_TOPRIGHT, 0.012, 0.01);
		BlzFrameSetPoint(tooltipText, FRAMEPOINT_TOPLEFT, this.toggleButton, FRAMEPOINT_BOTTOMLEFT, 0.0, -0.01);
		BlzFrameSetEnable(tooltipText, false);
		BlzFrameSetText(tooltipText, '');

		BlzFrameSetTooltip(this.toggleButton, tooltipFrame);
		this.tooltipTextFrame = tooltipText;
	}
}
