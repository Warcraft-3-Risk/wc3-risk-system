import { ClientManager } from '../game/services/client-manager';
import { NameManager } from './names/name-manager';
import { PlayerManager } from '../player/player-manager';
import { EDITOR_DEVELOPER_MODE } from 'src/configs/game-settings';
import { ChatUIManager } from './chat-ui-manager';

declare function World2Screen(x: number, y: number, z: number): LuaMultiReturn<[number, number, boolean]>;

export class TooltipManager {
	private static instance: TooltipManager;

	private tooltipBox: framehandle;
	private tooltipText: framehandle;
	private lastFocusUnit: unit = null;
	private isVisible: boolean = false;

	private constructor() {
		this.init();
	}

	static getInstance(): TooltipManager {
		if (this.instance == null) {
			this.instance = new TooltipManager();
		}
		return this.instance;
	}

	private init(): void {
		const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0);

		const uberTooltip = BlzGetOriginFrame(ORIGIN_FRAME_UBERTOOLTIP, 0);
		const uberTooltipBox = BlzCreateSimpleFrame('SimpleTasToolTipBox', uberTooltip, 0);
		BlzFrameSetAllPoints(uberTooltipBox, uberTooltip);
		BlzFrameSetLevel(uberTooltipBox, 0);

		this.tooltipBox = BlzCreateFrame('TasToolTipBox', gameUI, 0, 0);
		this.tooltipText = BlzCreateFrame('TasTooltipText', this.tooltipBox, 0, 0);

		BlzFrameSetPoint(this.tooltipBox, FRAMEPOINT_BOTTOMLEFT, this.tooltipText, FRAMEPOINT_BOTTOMLEFT, -0.01, -0.01);
		BlzFrameSetPoint(this.tooltipBox, FRAMEPOINT_TOPRIGHT, this.tooltipText, FRAMEPOINT_TOPRIGHT, 0.01, 0.01);
		BlzFrameSetAlpha(this.tooltipBox, 255);
		BlzFrameSetAlpha(this.tooltipText, 255);
		BlzFrameSetEnable(this.tooltipText, false);
		this.hide();

		const hoverTimer = CreateTimer();
		TimerStart(hoverTimer, 0.02, true, () => this.onTick());
	}

	private onTick(): void {
		const focusUnit = BlzGetMouseFocusUnit();

		if (focusUnit !== this.lastFocusUnit) {
			this.lastFocusUnit = focusUnit;
			this.updateTooltip(focusUnit);
		}

		if (this.isVisible && this.lastFocusUnit) {
			const [sx, sy, onScreen] = World2Screen(
				GetUnitX(this.lastFocusUnit),
				GetUnitY(this.lastFocusUnit),
				BlzGetUnitZ(this.lastFocusUnit) || 0
			);
			if (onScreen) {
				BlzFrameSetAbsPoint(this.tooltipText, FRAMEPOINT_BOTTOM, sx, sy + 0.025);
			}
		}
	}

	private updateTooltip(unit: unit): void {
		if (!unit) {
			this.hide();
			return;
		}

		if (!IsUnitVisible(unit, GetLocalPlayer())) {
			this.hide();
			return;
		}

		const cm = ClientManager.getInstance();

		// Don't show tooltip for units we own (directly or via client slot)
		// Exception: in developer mode, show our own units' owner name too
		if (cm.isPlayerOrClientOwnerOfUnit(unit, GetLocalPlayer())) {
			if (!EDITOR_DEVELOPER_MODE) {
				this.hide();
				return;
			}
		}

		// Resolve client slots to their real player owner (used for isActive check)
		const effectiveOwner = cm.getOwnerOfUnit(unit);

		// Player-owned unit — show owner's colored display name
		// In dev mode: show raw slot owner so client slots display their own color (e.g. Purple),
		// not the real player who controls them (e.g. Red)
		if (PlayerManager.getInstance().isActive(effectiveOwner)) {
			const displayOwner = EDITOR_DEVELOPER_MODE ? GetOwningPlayer(unit) : effectiveOwner;
			const name = NameManager.getInstance().getDisplayName(displayOwner);
			this.show(name, this.visibleLength(name));
			return;
		}

		// Neutral/non-player unit — show unit name
		const name = GetUnitName(unit);
		this.show(name, this.visibleLength(name));
	}

	// Returns the number of visible characters, stripping |cFFRRGGBB (10 chars) and |r (2 chars)
	private visibleLength(text: string): number {
		let overhead = 0;
		let i = 0;
		while (i < text.length) {
			if (text.charAt(i) === '|' && i + 1 < text.length) {
				const next = text.charAt(i + 1);
				if (next === 'c' || next === 'C') {
					overhead += 10;
					i += 10;
				} else if (next === 'r') {
					overhead += 2;
					i += 2;
				} else {
					i++;
				}
			} else {
				i++;
			}
		}
		return text.length - overhead;
	}

	private show(text: string, visibleLength: number): void {
		BlzFrameSetSize(this.tooltipText, Math.max(0.02, visibleLength * 0.005 + 0.01), 0.0058);
		BlzFrameSetText(this.tooltipText, text);
		BlzFrameSetVisible(this.tooltipBox, true);
		BlzFrameSetVisible(this.tooltipText, true);
		this.isVisible = true;
	}

	private hide(): void {
		BlzFrameSetVisible(this.tooltipBox, false);
		BlzFrameSetVisible(this.tooltipText, false);
		this.isVisible = false;
	}
}
