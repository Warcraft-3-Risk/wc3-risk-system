import { PlayerManager } from 'src/app/player/player-manager';
import { SharedSlotManager } from './shared-slot-manager';

export interface OwnerResolution {
	rawOwner: player;
	effectiveOwner: player;
	isSharedSlot: boolean;
	isTrackedMatchPlayer: boolean;
}

export function resolveRawOwner(rawOwner: player): OwnerResolution {
	const effectiveOwner = SharedSlotManager.getInstance().getOwner(rawOwner);

	return {
		rawOwner,
		effectiveOwner,
		isSharedSlot: rawOwner !== effectiveOwner,
		isTrackedMatchPlayer: isTrackedMatchPlayer(effectiveOwner),
	};
}

export function resolveUnitOwner(unit: unit): OwnerResolution {
	return resolveRawOwner(GetOwningPlayer(unit));
}

export function isTrackedMatchPlayer(player: player): boolean {
	return PlayerManager.getInstance().players.has(player);
}
