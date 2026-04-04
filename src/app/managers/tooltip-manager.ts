import { SharedSlotManager } from '../game/services/shared-slot-manager';
import { NameManager } from './names/name-manager';
import { PlayerManager } from '../player/player-manager';
import { EDITOR_DEVELOPER_MODE } from 'src/configs/game-settings';
import { UNIT_ID } from 'src/configs/unit-id';

declare function World2Screen(x: number, y: number, z: number): LuaMultiReturn<[number, number, boolean]>;

export class TooltipManager {
	private static instance: TooltipManager;

	private tooltipBox: framehandle;
	private tooltipText: framehandle;
	private lastFocusUnit: unit = null;
	private isVisible: boolean = false;
	private tooltipOffsets: Map<number, number>;

	private constructor() {
		this.tooltipOffsets = this.buildTooltipOffsets();
		this.init();
	}

	static getInstance(): TooltipManager {
		if (this.instance == null) {
			this.instance = new TooltipManager();
		}
		return this.instance;
	}

	private init(): void {
		const uberTooltip = BlzGetOriginFrame(ORIGIN_FRAME_UBERTOOLTIP, 0);
		const uberTooltipBox = BlzCreateSimpleFrame('SimpleTasToolTipBox', uberTooltip, 0);
		BlzFrameSetAllPoints(uberTooltipBox, uberTooltip);
		BlzFrameSetLevel(uberTooltipBox, 0);

		this.tooltipBox = BlzCreateFrame('TasToolTipBox', BlzGetFrameByName('ConsoleUIBackdrop', 0), 0, 0);
		this.tooltipText = BlzCreateFrame('TasTooltipText', this.tooltipBox, 0, 0);

		BlzFrameSetPoint(this.tooltipBox, FRAMEPOINT_BOTTOMLEFT, this.tooltipText, FRAMEPOINT_BOTTOMLEFT, -0.004, -0.008);
		BlzFrameSetPoint(this.tooltipBox, FRAMEPOINT_TOPRIGHT, this.tooltipText, FRAMEPOINT_TOPRIGHT, 0.004, 0.008);
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
			let unitXPosition = GetUnitX(this.lastFocusUnit);
			let unitYPosition = GetUnitY(this.lastFocusUnit);
			let unitZPosition = BlzGetUnitZ(this.lastFocusUnit);

			if(BlzGetUnitCollisionSize(this.lastFocusUnit) < 31.5 || BlzGetUnitCollisionSize(this.lastFocusUnit) > 47.5) {
				unitXPosition = unitXPosition - 16;
				unitYPosition = unitYPosition - 16;
			}

			const [sx, sy, onScreen] = World2Screen(
				unitXPosition,
				unitYPosition,
				(unitZPosition + this.getTooltipOffset(this.lastFocusUnit)) || 0
			);

			if (onScreen) {
				BlzFrameSetAbsPoint(this.tooltipText, FRAMEPOINT_BOTTOM, sx, sy + 0.015);
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

		const cm = SharedSlotManager.getInstance();

		// Don't show tooltip for units we own (directly or via shared slot)
		// Exception: in developer mode, show our own units' owner name too
		if (cm.canPlayerSeeUnitTooltip(unit, GetLocalPlayer())) {
			if (!EDITOR_DEVELOPER_MODE) {
				this.hide();
				return;
			}
		}

		// Resolve shared slots to their real player owner (used for isActive check)
		const effectiveOwner = cm.getOwnerOfUnit(unit);

		// Player-owned unit — show owner's colored display name
		// In dev mode: show raw slot owner so shared slots display their own color (e.g. Purple),
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

	// Returns screen-space Y offset for tooltip placement
	private getTooltipOffset(u: unit): number {
		const typeId = GetUnitTypeId(u);
		const offset = this.tooltipOffsets.get(typeId);
		return offset != null ? offset : 0;
	}

	// Screen-space Y offsets per unit type — tune these values in-game
	private buildTooltipOffsets(): Map<number, number> {
		const offsets = new Map<number, number>();
		// Structures
		offsets.set(UNIT_ID.CITY, 200);
		offsets.set(UNIT_ID.PORT, 200);
		offsets.set(UNIT_ID.CONTROL_POINT, 100);
		offsets.set(UNIT_ID.SPAWNER, 100);
		offsets.set(UNIT_ID.CAPITAL, 100);
		offsets.set(UNIT_ID.CONQUERED_CAPITAL, 100);
		// City Units
		offsets.set(UNIT_ID.RIFLEMEN, 80);
		offsets.set(UNIT_ID.MEDIC, 190);
		offsets.set(UNIT_ID.MORTAR, 100);
		offsets.set(UNIT_ID.ROARER, 190);
		offsets.set(UNIT_ID.KNIGHT, 100);
		offsets.set(UNIT_ID.GENERAL, 190);
		offsets.set(UNIT_ID.ARTILLERY, 120);
		offsets.set(UNIT_ID.TANK, 120);
		// Port Units
		offsets.set(UNIT_ID.MARINE, 80);
		offsets.set(UNIT_ID.MAJOR, 100);
		offsets.set(UNIT_ID.ADMIRAL, 100);
		offsets.set(UNIT_ID.TRANSPORT_SHIP, 300);
		offsets.set(UNIT_ID.ARMORED_TRANSPORT_SHIP, 150);
		offsets.set(UNIT_ID.WARSHIP_A, 275);
		offsets.set(UNIT_ID.WARSHIP_B, 300);
		offsets.set(UNIT_ID.BATTLESHIP_SS, 420);
		return offsets;
	}
}
