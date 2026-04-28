import { SharedSlotManager } from '../game/services/shared-slot-manager';
import { PlayerManager } from '../player/player-manager';
import { UNIT_TYPE } from '../utils/unit-types';
import { NEUTRAL_HOSTILE } from '../utils/utils';

export class AllyColorFilterManager {
	private static instance: AllyColorFilterManager;

	public static getInstance(): AllyColorFilterManager {
		if (!this.instance) {
			this.instance = new AllyColorFilterManager();
		}
		return this.instance;
	}

	private constructor() {}

	/**
	 * Applies the current ally color filter to a specific unit.
	 * Should be called whenever a unit is created, trained, or changes ownership.
	 * @param u The unit to apply the color filter to.
	 */
	public applyColorFilter(u: unit): void {
		const owner = SharedSlotManager.getInstance().getOwnerOfUnit(u);
		const isLocalOwner = GetLocalPlayer() === owner;
		const isSpawn = IsUnitType(u, UNIT_TYPE.SPAWN);
		const alpha = isLocalOwner && isSpawn ? 150 : 255;

		const activeLocalPlayer = PlayerManager.getInstance().players.get(GetLocalPlayer());
		const isColorBlind = activeLocalPlayer ? activeLocalPlayer.options.colorblind : false;

		const isColorContrast = activeLocalPlayer ? activeLocalPlayer.options.colorContrast : false;

                if (isColorContrast) {
			if (owner === NEUTRAL_HOSTILE) {
				SetUnitVertexColor(u, 0, 0, 0, alpha);
			} else if (isLocalOwner) {
				SetUnitVertexColor(u, 0, 0, 255, alpha);
			} else if (IsPlayerAlly(GetLocalPlayer(), owner)) {
				if (isColorBlind) {
					SetUnitVertexColor(u, 255, 255, 0, alpha); // Yellow
				} else {
					SetUnitVertexColor(u, 0, 255, 255, alpha); // Teal
				}
			} else {
				SetUnitVertexColor(u, 255, 50, 50, alpha);
			}
		} else {
			if (isLocalOwner && isSpawn) {
				SetUnitVertexColor(u, 200, 200, 200, 150);
			} else {
				SetUnitVertexColor(u, 255, 255, 255, 255);
			}
		}
	}

	/**
	 * Returns a hex color string (e.g., '|cFF0000FF') corresponding to the unit's
	 * high contrast color if the filter is active and applies. Otherwise returns undefined.
	 */
	public getTooltipColorHex(u: unit): string | undefined {
		const owner = SharedSlotManager.getInstance().getOwnerOfUnit(u);
		const isLocalOwner = GetLocalPlayer() === owner;

		const activeLocalPlayer = PlayerManager.getInstance().players.get(GetLocalPlayer());
		const isColorBlind = activeLocalPlayer ? activeLocalPlayer.options.colorblind : false;

		const isColorContrast = activeLocalPlayer ? activeLocalPlayer.options.colorContrast : false;

                if (isColorContrast) {
			if (owner === NEUTRAL_HOSTILE) {
				return '|cFF888888'; // Gray is more readable than black for tooltips
			} else if (isLocalOwner) {
				return '|cFF0000FF'; // Blue
			} else if (IsPlayerAlly(GetLocalPlayer(), owner)) {
				if (isColorBlind) {
					return '|cFFFFFF00'; // Yellow
				} else {
					return '|cFF00FFFF'; // Teal
				}
			} else {
				return '|cFFFF0000'; // Red
			}
		}

		return undefined;
	}
}

