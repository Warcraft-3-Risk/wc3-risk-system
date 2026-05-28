import { AllyColorState } from '../managers/alliances/ally-color-state';

export const ALLY_COLOR_MODE_BUTTON_TEXTURES = [
	'UI\\Widgets\\Console\\Human\\human-minimap-ally-off.blp',
	'UI\\Widgets\\Console\\Human\\human-minimap-ally-inactive.blp',
	'UI\\Widgets\\Console\\Human\\human-minimap-ally-active.blp',
] as const;

export const ALLY_COLOR_MODE_BUTTON_BACKGROUND_TEXTURE = 'ReplaceableTextures\\TeamColor\\TeamColor24.blp';
const FALLBACK_BUTTON_CENTER_X_FROM_CONSOLE_LEFT = 0.166;
const FALLBACK_BUTTON_CENTER_Y = 0.09;
const FALLBACK_BUTTON_SIZE = 0.021294;
const BACKGROUND_SIZE_RATIO = 0.84;
const BACKGROUND_WIDTH_RATIO = 1.1;
const FULL_CONSOLE_SIZE_SCALE = 0.95;
const ZERO_CONSOLE_SIZE_SCALE = 1.08;
const BACKGROUND_FRAME_LEVEL = 10;
const ICON_FRAME_LEVEL = 11;
const BUTTON_FRAME_LEVEL = 12;

export function getAllyColorModeButtonTexture(mode: number): string {
	return ALLY_COLOR_MODE_BUTTON_TEXTURES[mode] || ALLY_COLOR_MODE_BUTTON_TEXTURES[0];
}

export class AllyColorModeButton {
	private static instance: AllyColorModeButton;
	private background: framehandle;
	private button: framehandle;
	private icon: framehandle;
	private consoleUI: framehandle;
	private consoleSizeScale: number = 1.0;
	private hudScale: number = 1.0;
	private lastConsoleSizeScale: number = -1;
	private lastLayoutScale: number = -1;
	private lastMode: number = -1;

	private constructor() {
		this.createButton();
		this.refresh();
	}

	public static getInstance(): AllyColorModeButton {
		if (!this.instance) {
			this.instance = new AllyColorModeButton();
		}
		return this.instance;
	}

	public static refreshExisting(): void {
		if (this.instance) {
			this.instance.refresh();
		}
	}

	private createButton(): void {
		const parentFrame = BlzGetOriginFrame(ORIGIN_FRAME_MINIMAP, 0) || BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0);
		this.consoleUI = BlzGetFrameByName('ConsoleUIBackdrop', 0);
		const ctx = 0;

		this.background = BlzCreateFrameByType('BACKDROP', 'AllyColorModeBackground', parentFrame, '', ctx);
		BlzFrameSetLevel(this.background, BACKGROUND_FRAME_LEVEL);
		BlzFrameSetTexture(this.background, ALLY_COLOR_MODE_BUTTON_BACKGROUND_TEXTURE, 0, true);

		this.icon = BlzCreateFrameByType('BACKDROP', 'AllyColorModeIcon', parentFrame, '', ctx);
		BlzFrameSetLevel(this.icon, ICON_FRAME_LEVEL);

		this.button = BlzCreateFrameByType('GLUETEXTBUTTON', 'AllyColorModeButton', parentFrame, 'ScriptDialogButton', ctx);
		BlzFrameSetLevel(this.button, BUTTON_FRAME_LEVEL);
		BlzFrameSetText(this.button, '');
		BlzFrameSetAlpha(this.button, 0);

		const trigger = CreateTrigger();
		BlzTriggerRegisterFrameEvent(trigger, this.button, FRAMEEVENT_CONTROL_CLICK);
		TriggerAddCondition(
			trigger,
			Condition(() => {
				if (GetTriggerPlayer() !== GetLocalPlayer()) {
					return;
				}

				this.toggleMode();
			})
		);
	}

	private toggleMode(): void {
		SetAllyColorFilterState(0);

		const state = AllyColorState.getInstance();
		state.toggle();
		this.refresh();

		BlzFrameSetEnable(this.button, false);
		BlzFrameSetEnable(this.button, true);
	}

	private refresh(): void {
		this.refreshLayout();
		this.refreshTexture();
	}

	private refreshTexture(): void {
		const mode = AllyColorState.getInstance().getMode();
		if (mode === this.lastMode) {
			return;
		}

		this.lastMode = mode;
		BlzFrameSetTexture(this.icon, getAllyColorModeButtonTexture(mode), 0, true);
	}

	private refreshLayout(): void {
		this.updateHudScale();
		if (this.hudScale === this.lastLayoutScale && this.consoleSizeScale === this.lastConsoleSizeScale) {
			return;
		}

		this.lastLayoutScale = this.hudScale;
		this.lastConsoleSizeScale = this.consoleSizeScale;

		const uiLeftEdgeX = 0.4 - (0.8 * this.hudScale) / 2.0;
		const centerX = uiLeftEdgeX + FALLBACK_BUTTON_CENTER_X_FROM_CONSOLE_LEFT * this.hudScale;
		const centerY = FALLBACK_BUTTON_CENTER_Y * this.hudScale;
		const size = this.getButtonSize();
		const backgroundHeight = size * BACKGROUND_SIZE_RATIO;
		const backgroundWidth = backgroundHeight * BACKGROUND_WIDTH_RATIO;

		this.positionFrame(this.icon, centerX, centerY, size, size);
		this.positionFrame(this.background, centerX, centerY, backgroundWidth, backgroundHeight);
		this.positionFrame(this.button, centerX, centerY, size, size);
	}

	private updateHudScale(): void {
		if (!this.consoleUI) {
			this.consoleUI = BlzGetFrameByName('ConsoleUIBackdrop', 0);
		}

		const currentScale = this.consoleUI ? BlzFrameGetWidth(this.consoleUI) / 0.8 : 1.0;
		this.consoleSizeScale = this.clamp(currentScale, 0.0, 1.0);
		if (currentScale > 0) {
			this.hudScale = currentScale;
		}
	}

	private getButtonSize(): number {
		const zeroScaleProgress = 1.0 - this.consoleSizeScale;
		const sizeScale = FULL_CONSOLE_SIZE_SCALE + zeroScaleProgress * (ZERO_CONSOLE_SIZE_SCALE - FULL_CONSOLE_SIZE_SCALE);
		return FALLBACK_BUTTON_SIZE * sizeScale;
	}

	private clamp(value: number, min: number, max: number): number {
		return Math.max(min, Math.min(max, value));
	}

	private positionFrame(frame: framehandle, centerX: number, centerY: number, width: number, height: number): void {
		BlzFrameClearAllPoints(frame);
		BlzFrameSetAbsPoint(frame, FRAMEPOINT_CENTER, centerX, centerY);
		BlzFrameSetSize(frame, width, height);
	}
}
