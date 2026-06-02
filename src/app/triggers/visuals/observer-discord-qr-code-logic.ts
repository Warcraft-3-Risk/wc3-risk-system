export interface ObserverDiscordQrToggleState {
	isObserver: boolean;
	isDeveloperMode: boolean;
}

export interface EliminatedPlayerDiscordQrState {
	isLocalPlayer: boolean;
	isPromode: boolean;
	isEqualizedPromode: boolean;
	isChaosPromode: boolean;
}

export const ELIMINATED_PLAYER_DISCORD_QR_OPTIONS = {
	centerX: 0.72,
	centerY: 0.09,
	moduleSize: 0.0038,
};

export function shouldShowObserverDiscordQrToggle(state: ObserverDiscordQrToggleState): boolean {
	return state.isObserver || state.isDeveloperMode;
}

export function shouldAutoShowDiscordQrForEliminatedPlayer(state: EliminatedPlayerDiscordQrState): boolean {
	return state.isLocalPlayer && !state.isPromode && !state.isEqualizedPromode && !state.isChaosPromode;
}
