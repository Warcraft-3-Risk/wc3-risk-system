/**
 * True when the given player is in a team game and has at least one allied player, so there is
 * somebody whose camera they could follow. Always false in FFA, and for 1v1 promode (team diplomacy
 * but nobody on your side). Alliances are only valid once the diplomacy strategy has been applied.
 *
 * Deliberately has no module-level imports: both the camera button and the camera manager use this,
 * and a static import of SettingsContext/PlayerManager here would close an import cycle through
 * player-manager, which recurses at map load.
 */
export function canUseAllyCameras(p: player): boolean {
	if (IsPlayerObserver(p)) return false;

	const { SettingsContext } = require('src/app/settings/settings-context') as typeof import('../settings/settings-context');
	if (SettingsContext.getInstance().isFFA()) return false;

	for (let i = 0; i < bj_MAX_PLAYERS; i++) {
		const other: player = Player(i);

		if (other === p || IsPlayerObserver(other)) continue;
		if (GetPlayerSlotState(other) !== PLAYER_SLOT_STATE_PLAYING) continue;

		if (IsPlayerAlly(p, other)) return true;
	}

	return false;
}
