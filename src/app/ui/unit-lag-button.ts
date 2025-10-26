import { ActivePlayer } from '../player/types/active-player';
import { createUnitLagButton } from '../factory/unit-lag-button-factory';

export function buildUnitLagButton(player: ActivePlayer): framehandle {
	return createUnitLagButton({
		player: player,
		createContext: GetPlayerId(player.getPlayer()) + 100,
		key: OSKEY_F2,
		texture: 'ReplaceableTextures\\CommandButtons\\BTNUnitLag.blp',
		xOffset: 0.056,
		action: (context: number, textures: string) => {
			// Stops all units of the given player on the map
			const g: group = CreateGroup();
			GroupEnumUnitsOfPlayer(g, player.getPlayer(), null);

			ForGroup(g, () => {
				const u = GetEnumUnit();
				BlzPauseUnitEx(u, true);
				BlzPauseUnitEx(u, false);
				IssueImmediateOrder(u, 'stop');
			});
		},
	});
}
