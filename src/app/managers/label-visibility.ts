import { DefaultCountryLabels } from '../player/options';

export const ObserverLabelSlotId = 23;

export interface LabelVisibilityState {
	playerId: number;
	isObserver?: boolean;
	countryLabels?: boolean;
}

export function isObserverLabelSlot(playerId: number): boolean {
	return playerId === ObserverLabelSlotId;
}

export function shouldShowCountryLabels(state: LabelVisibilityState): boolean {
	return state.isObserver === true || isObserverLabelSlot(state.playerId) || (state.countryLabels ?? DefaultCountryLabels);
}

export function shouldShowCityLabels(state: LabelVisibilityState): boolean {
	return state.isObserver === true || isObserverLabelSlot(state.playerId);
}
