import { ActivePlayer } from '../player/types/active-player';
import { createUnitLagButton } from '../factory/unit-lag-button-factory';
import { HexColors } from '../utils/hex-colors';

export function buildUnitLagButton(player: ActivePlayer): framehandle {
	return createUnitLagButton({
		active: true,
		player: player,
		createContext: GetPlayerId(player.getPlayer()) + 100,
		key: OSKEY_F2,
		textures: {
			active: 'ReplaceableTextures\\CommandButtons\\BTNUnitLag.blp',
			disabled: 'ReplaceableTextures\\CommandButtonsDisabled\\DISBTNUnitLag.blp',
		},
		xOffset: 0.056,
		action: (context: number, textures: {
			active: string,
			disabled: string
		}, active: boolean) => {
			// Action
			// Stops all units of the given player on the map
			if(active) {
				const g: group = CreateGroup();
				GroupEnumUnitsOfPlayer(g, player.getPlayer(), null);

				ForGroup(g, () => {
					const u = GetEnumUnit();
					BlzPauseUnitEx(u, true);
					BlzPauseUnitEx(u, false);
					IssueImmediateOrder(u, 'stop');
				});

				// Change button to disabled
				const buttonBackdrop = BlzGetFrameByName('UnitLagButtonBackdrop', context);
				BlzFrameSetTexture(buttonBackdrop, textures.disabled, 0, false);

				const buttonTooltip = BlzGetFrameByName('UnitLagButtonTooltip', context);
				BlzFrameSetText(
					buttonTooltip,
					`Stop All ${HexColors.TANGERINE}(F2)|r\nStops all of your units immediately.`
				);
				BlzFrameSetEnable(buttonTooltip, false);
				print("disable");
			}
		},
	});
}
