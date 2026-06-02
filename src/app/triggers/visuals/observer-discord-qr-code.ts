import { EDITOR_DEVELOPER_MODE } from 'src/configs/game-settings';
import { QrCodeFrameRenderer } from '../../ui/qr-code-frame-renderer';
import { CreateObserverButton } from '../../utils/observer-helper';
import { EventEmitter } from '../../utils/events/event-emitter';
import { EVENT_ON_PLAYER_DEAD, EVENT_ON_PRE_MATCH } from '../../utils/events/event-constants';
import { SettingsContext } from '../../settings/settings-context';
import {
	ELIMINATED_PLAYER_DISCORD_QR_OPTIONS,
	shouldAutoShowDiscordQrForEliminatedPlayer,
	shouldShowObserverDiscordQrToggle,
} from './observer-discord-qr-code-logic';
import type { ActivePlayer } from '../../player/types/active-player';

export class ObserverDiscordQrCode {
	private static instance: ObserverDiscordQrCode;
	private qrCodeFrame: QrCodeFrameRenderer;
	private eliminatedPlayerQrCodeFrame: QrCodeFrameRenderer;
	private toggleButton: framehandle;
	private toggleIcon: framehandle;

	private constructor() {
		this.qrCodeFrame = QrCodeFrameRenderer.createDiscordInvite();
		this.eliminatedPlayerQrCodeFrame = QrCodeFrameRenderer.createDiscordInvite(ELIMINATED_PLAYER_DISCORD_QR_OPTIONS);
		this.createToggleButton();

		EventEmitter.getInstance().on(EVENT_ON_PRE_MATCH, () => {
			this.eliminatedPlayerQrCodeFrame.hide();
			this.updateEligibility();
		});

		EventEmitter.getInstance().on(EVENT_ON_PLAYER_DEAD, (player: ActivePlayer) => {
			this.showForEliminatedLocalPlayer(player);
		});
	}

	public static getInstance(): ObserverDiscordQrCode {
		if (!this.instance) {
			this.instance = new ObserverDiscordQrCode();
		}
		return this.instance;
	}

	public updateEligibility(): void {
		const isEligible = this.isEligibleLocalPlayer();

		BlzFrameSetVisible(this.toggleButton, isEligible);
		BlzFrameSetVisible(this.toggleIcon, isEligible);
		BlzFrameSetEnable(this.toggleButton, isEligible);

		if (!isEligible) {
			this.qrCodeFrame.hide();
			this.updateToggleIcon(false);
		}
	}

	private showForEliminatedLocalPlayer(player: ActivePlayer): void {
		const settings = SettingsContext.getInstance();
		const shouldShow = shouldAutoShowDiscordQrForEliminatedPlayer({
			isLocalPlayer: player.getPlayer() === GetLocalPlayer(),
			isPromode: settings.isPromode(),
			isEqualizedPromode: settings.isEqualizedPromode(),
			isChaosPromode: settings.isChaosPromode(),
		});

		if (shouldShow) {
			this.eliminatedPlayerQrCodeFrame.show();
		}
	}

	private createToggleButton(): void {
		const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0);
		const ctx = 900;

		this.toggleIcon = BlzCreateFrameByType('BACKDROP', 'ObserverDiscordQrIcon', gameUI, '', ctx);
		BlzFrameSetPoint(this.toggleIcon, FRAMEPOINT_TOPLEFT, gameUI, FRAMEPOINT_TOPLEFT, 0.184, -0.025);
		BlzFrameSetSize(this.toggleIcon, 0.02, 0.02);
		BlzFrameSetTexture(this.toggleIcon, 'ReplaceableTextures\\CommandButtonsDisabled\\DISBTNRecipe.blp', 0, true);

		this.toggleButton = BlzCreateFrameByType('GLUETEXTBUTTON', 'ObserverDiscordQrButton', gameUI, 'ScriptDialogButton', ctx);
		BlzFrameSetPoint(this.toggleButton, FRAMEPOINT_TOPLEFT, gameUI, FRAMEPOINT_TOPLEFT, 0.184, -0.025);
		BlzFrameSetSize(this.toggleButton, 0.02, 0.02);
		BlzFrameSetText(this.toggleButton, '');
		BlzFrameSetAlpha(this.toggleButton, 0);

		this.updateEligibility();

		CreateObserverButton(this.toggleButton, true, () => {
			if (this.isEligibleLocalPlayer()) {
				this.toggleQrCode();
			}
		});
	}

	private isEligibleLocalPlayer(): boolean {
		const localPlayer = GetLocalPlayer();
		return shouldShowObserverDiscordQrToggle({
			isObserver: IsPlayerObserver(localPlayer),
			isDeveloperMode: EDITOR_DEVELOPER_MODE,
		});
	}

	private toggleQrCode(): void {
		const isVisible = this.qrCodeFrame.toggle();
		BlzFrameSetText(this.toggleButton, '');
		this.updateToggleIcon(isVisible);

		BlzFrameSetEnable(this.toggleButton, false);
		BlzFrameSetEnable(this.toggleButton, true);
	}

	private updateToggleIcon(isVisible: boolean): void {
		const texture = isVisible
			? 'ReplaceableTextures\\CommandButtons\\BTNRecipe.blp'
			: 'ReplaceableTextures\\CommandButtonsDisabled\\DISBTNRecipe.blp';
		BlzFrameSetTexture(this.toggleIcon, texture, 0, true);
	}
}
