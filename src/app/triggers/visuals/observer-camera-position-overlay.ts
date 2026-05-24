import { EDITOR_DEVELOPER_MODE } from 'src/configs/game-settings';
import { CreateObserverButton } from '../../utils/observer-helper';

export class ObserverCameraPositionOverlay {
	private static instance: ObserverCameraPositionOverlay;
	private overlayVisible: boolean = false;
	private toggleButton: framehandle;
	private toggleIcon: framehandle;
	private visibilityChangedCallbacks: Array<(isVisible: boolean) => void> = [];

	private constructor() {
		this.createToggleButton();
	}

	public static getInstance(): ObserverCameraPositionOverlay {
		if (!this.instance) {
			this.instance = new ObserverCameraPositionOverlay();
		}
		return this.instance;
	}

	public isOverlayVisible(): boolean {
		return this.overlayVisible;
	}

	public onVisibilityChanged(callback: (isVisible: boolean) => void): void {
		this.visibilityChangedCallbacks.push(callback);
	}

	public updateEligibility(): void {
		const localPlayer = GetLocalPlayer();

		// Only visible for observers or developers
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
		const ctx = 500; // unique context to avoid collision with player frames

		this.toggleIcon = BlzCreateFrameByType('BACKDROP', 'CamToggleIcon', gameUI, '', ctx);
		BlzFrameSetPoint(this.toggleIcon, FRAMEPOINT_TOPLEFT, gameUI, FRAMEPOINT_TOPLEFT, 0.138, -0.025);
		BlzFrameSetSize(this.toggleIcon, 0.02, 0.02);
		BlzFrameSetTexture(this.toggleIcon, 'ReplaceableTextures\\CommandButtonsDisabled\\DISBTNTelescope.blp', 0, true);

		this.toggleButton = BlzCreateFrameByType('GLUETEXTBUTTON', 'CamToggleButton', gameUI, 'ScriptDialogButton', ctx);
		BlzFrameSetPoint(this.toggleButton, FRAMEPOINT_TOPLEFT, gameUI, FRAMEPOINT_TOPLEFT, 0.138, -0.025);
		BlzFrameSetSize(this.toggleButton, 0.02, 0.02);
		BlzFrameSetText(this.toggleButton, '');
		BlzFrameSetAlpha(this.toggleButton, 0);

		this.updateEligibility();

		const localPlayer = GetLocalPlayer();
		CreateObserverButton(this.toggleButton, IsPlayerObserver(localPlayer), () => {
			this.toggleOverlay();
		});
	}

	private toggleOverlay(): void {
		this.overlayVisible = !this.overlayVisible;
		BlzFrameSetText(this.toggleButton, '');

		const texture = this.overlayVisible
			? 'ReplaceableTextures\\CommandButtons\\BTNTelescope.blp'
			: 'ReplaceableTextures\\CommandButtonsDisabled\\DISBTNTelescope.blp';
		BlzFrameSetTexture(this.toggleIcon, texture, 0, true);

		for (const callback of this.visibilityChangedCallbacks) {
			callback(this.overlayVisible);
		}

		BlzFrameSetEnable(this.toggleButton, false);
		BlzFrameSetEnable(this.toggleButton, true);
	}
}
