import { createGuardButton } from '../factory/guard-button-factory';
import { ActivePlayer } from '../player/types/active-player';
import { HexColors } from '../utils/hex-colors';
import { ErrorMsg } from '../utils/messages';

const BUTTON_CONTEXT_OFFSET: number = 500;
const CANCEL_ORDERS_BUTTON_X_OFFSET: number = 0.069;
const COOLDOWN_SECONDS: number = 3;

const TEXTURE_READY: string = 'ReplaceableTextures\\CommandButtons\\BTNCancel.blp';
const TEXTURE_COOLDOWN: string = 'ReplaceableTextures\\CommandButtonsDisabled\\DISBTNCancel.blp';

// Reused for every press - the group is only filled and emptied synchronously inside the action
const unitsOfPlayer: group = CreateGroup();

/**
 * Builds the "cancel all orders" button (F3). Stops whatever every one of the player's own units is
 * currently doing, with a short cooldown so it cannot be spammed.
 *
 * Key presses and frame clicks are synced events, so the action - including the cooldown timer - runs
 * identically on every client.
 */
export function buildCancelOrdersButton(player: ActivePlayer): framehandle {
	const handle: player = player.getPlayer();
	const cooldownTimer: timer = CreateTimer();

	return createGuardButton({
		player: player,
		createContext: GetPlayerId(handle) + BUTTON_CONTEXT_OFFSET,
		key: OSKEY_F3,
		textures: {
			primary: TEXTURE_READY,
			secondary: TEXTURE_COOLDOWN,
		},
		xOffset: CANCEL_ORDERS_BUTTON_X_OFFSET,
		initialTooltipText: `Cancel All Orders ${HexColors.TANGERINE}(F3)|r\nOrders all of your units to stop, cancelling their current orders.\nCooldown: ${COOLDOWN_SECONDS} seconds`,
		action: (context: number, textures: { primary: string; secondary: string }) => {
			if (GetTriggerPlayer() !== handle) return;

			// Eliminated players no longer control their units
			if (!player.status.isActive()) return;

			if (TimerGetRemaining(cooldownTimer) > 0) {
				ErrorMsg(handle, `Cancel All Orders is on cooldown (${Math.ceil(TimerGetRemaining(cooldownTimer))}s)`);
				return;
			}

			cancelAllOrders(handle);

			const buttonBackdrop: framehandle = BlzGetFrameByName('GuardButtonBackdrop', context);
			BlzFrameSetTexture(buttonBackdrop, textures.secondary, 0, true);

			TimerStart(cooldownTimer, COOLDOWN_SECONDS, false, () => {
				BlzFrameSetTexture(buttonBackdrop, textures.primary, 0, true);
			});
		},
	});
}

/**
 * Issues a stop order to every unit the player owns. Buildings are skipped, so cities, barracks and
 * spawners keep their training queues and rally points.
 */
function cancelAllOrders(owner: player): void {
	GroupEnumUnitsOfPlayer(unitsOfPlayer, owner, null);

	for (let i = 0; i < BlzGroupGetSize(unitsOfPlayer); i++) {
		const u: unit = BlzGroupUnitAt(unitsOfPlayer, i);

		if (UnitAlive(u) && !IsUnitType(u, UNIT_TYPE_STRUCTURE)) {
			IssueImmediateOrder(u, 'stop');
		}
	}

	GroupClear(unitsOfPlayer);
}
