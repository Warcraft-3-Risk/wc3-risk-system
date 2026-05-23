import { EDITOR_DEVELOPER_MODE } from 'src/configs/game-settings';
import { RegionToCity } from '../../city/city-map';
import { CreateObserverButton } from '../../utils/observer-helper';

export class ObserverRangeIndicator {
	private static instance: ObserverRangeIndicator;
	private overlayVisible: boolean = false;
	private toggleButton: framehandle;
	private toggleIcon: framehandle;

	private constructor() {
		this.createToggleButton();
	}

	public static getInstance(): ObserverRangeIndicator {
		if (!this.instance) {
			this.instance = new ObserverRangeIndicator();
		}
		return this.instance;
	}

	private updateVisibility(): void {
		const alpha = this.overlayVisible ? 25 : 0;
		for (const city of RegionToCity.values()) {
			BlzSetSpecialEffectAlpha(city.effect, alpha);
		}
	}

	private createToggleButton(): void {
		const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0);
		const ctx = 800; // unique context to avoid collision

		this.toggleIcon = BlzCreateFrameByType('BACKDROP', 'ObserverRangeIndicatorIcon', gameUI, '', ctx);
		BlzFrameSetPoint(this.toggleIcon, FRAMEPOINT_TOPLEFT, gameUI, FRAMEPOINT_TOPLEFT, 0.161, -0.025);
		BlzFrameSetSize(this.toggleIcon, 0.02, 0.02);
		BlzFrameSetTexture(this.toggleIcon, 'ReplaceableTextures\\CommandButtonsDisabled\\DISBTNCOP.blp', 0, true);

		this.toggleButton = BlzCreateFrameByType('GLUETEXTBUTTON', 'ObserverRangeIndicatorButton', gameUI, 'ScriptDialogButton', ctx);
		BlzFrameSetPoint(this.toggleButton, FRAMEPOINT_TOPLEFT, gameUI, FRAMEPOINT_TOPLEFT, 0.161, -0.025);
		BlzFrameSetSize(this.toggleButton, 0.02, 0.02);
		BlzFrameSetText(this.toggleButton, '');
		BlzFrameSetAlpha(this.toggleButton, 0);

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

		CreateObserverButton(this.toggleButton, IsPlayerObserver(localPlayer), () => {
			this.toggleOverlay();
		});
	}

	private toggleOverlay(): void {
		this.overlayVisible = !this.overlayVisible;
		BlzFrameSetText(this.toggleButton, '');

		const texture = this.overlayVisible
			? 'ReplaceableTextures\\CommandButtons\\BTNCOP.blp'
			: 'ReplaceableTextures\\CommandButtonsDisabled\\DISBTNCOP.blp';
		BlzFrameSetTexture(this.toggleIcon, texture, 0, true);

		this.updateVisibility();

		BlzFrameSetEnable(this.toggleButton, false);
		BlzFrameSetEnable(this.toggleButton, true);
	}
}
