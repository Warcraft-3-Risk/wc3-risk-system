import { createGuardButton } from '../factory/guard-button-factory';
import { ActivePlayer } from '../player/types/active-player';
import { HexColors } from '../utils/hex-colors';
import { CityToCountry } from '../country/country-map';
import { Country } from '../country/country';
import { File } from 'w3ts';

export function buildGuardHealthButton(player: ActivePlayer): framehandle {
	return createGuardButton({
		player: player,
		createContext: GetPlayerId(player.getPlayer()),
		key: OSKEY_F6,
		textures: {
			primary: 'ReplaceableTextures\\CommandButtons\\BTNHeartBottleHalfEmpty.blp',
			secondary: 'ReplaceableTextures\\CommandButtons\\BTNHeartBottle_Full.blp',
		},
		xOffset: 0.00,
		action: (context: number, textures: { primary: string; secondary: string }) => {
			player.options.health = !player.options.health;

			const buttonBackdrop = BlzGetFrameByName('GuardButtonBackdrop', context);
			const texture = player.options.health ? textures.secondary : textures.primary;

			BlzFrameSetTexture(buttonBackdrop, texture, 0, false);

			const buttonTooltip = BlzGetFrameByName('GuardButtonToolTip', context);
			BlzFrameSetText(
				buttonTooltip,
				`Guard Health Preference ${HexColors.TANGERINE}(F6)|r\nSets your preference for unit health when taking possession of a city.\nCurrent preference: ` +
					`${player.options.health ? `${HexColors.RED}Highest` : `${HexColors.GREEN}Lowest`}`
			);
		},
	});
}

export function buildGuardValueButton(player: ActivePlayer): framehandle {
	return createGuardButton({
		player: player,
		createContext: GetPlayerId(player.getPlayer()) + 100,
		key: OSKEY_F7,
		textures: {
			primary: 'ReplaceableTextures\\CommandButtons\\BTNIncome.blp',
			secondary: 'ReplaceableTextures\\CommandButtons\\BTNGoldPile.blp',
		},
		xOffset: 0.023,
		action: (context: number, textures: { primary: string; secondary: string }) => {
			player.options.value = !player.options.value;

			const buttonBackdrop = BlzGetFrameByName('GuardButtonBackdrop', context);
			const texture = player.options.value ? textures.secondary : textures.primary;

			BlzFrameSetTexture(buttonBackdrop, texture, 0, false);

			const buttonTooltip = BlzGetFrameByName('GuardButtonToolTip', context);
			BlzFrameSetText(
				buttonTooltip,
				`Guard Value Preference ${HexColors.TANGERINE}(F7)|r\nSets your preference for unit value when taking possession of a city.\nCurrent preference: ` +
					`${player.options.value ? `${HexColors.RED}Highest` : `${HexColors.GREEN}Lowest`}`
			);
		},
	});
}

export function buildLabelToggleButton(player: ActivePlayer): framehandle {
	return createGuardButton({
		player: player,
		createContext: GetPlayerId(player.getPlayer()) + 200,
		key: OSKEY_F8,
		textures: {
			primary: 'ReplaceableTextures\\CommandButtons\\BTNRecipe.blp',
			secondary: 'ReplaceableTextures\\CommandButtonsDisabled\\DISBTNRecipe.blp',
		},
		xOffset: 0.046,
		initialTooltipText: `Country Labels ${HexColors.TANGERINE}(F8)|r\nToggles the visibility of country name labels on the map.\nCurrent preference: ${HexColors.GREEN}Visible`,
		action: (context: number, textures: { primary: string; secondary: string }) => {
			player.options.labels = !player.options.labels;

			// Only update visuals for the local player
			if (player.getPlayer() == GetLocalPlayer()) {
				// Save labels preference to file
				File.write('risk/labels.pld', `${player.options.labels}`);

				// Toggle visibility for all country labels
				const countrySet: Set<Country> = new Set(CityToCountry.values());
				countrySet.forEach((country) => {
					country.setLabelVisibility(player.options.labels);
				});

				const buttonBackdrop = BlzGetFrameByName('GuardButtonBackdrop', context);
				const texture = player.options.labels ? textures.primary : textures.secondary;

				BlzFrameSetTexture(buttonBackdrop, texture, 0, false);

				const buttonTooltip = BlzGetFrameByName('GuardButtonToolTip', context);
				BlzFrameSetText(
					buttonTooltip,
					`Country Labels ${HexColors.TANGERINE}(F8)|r\nToggles the visibility of country name labels on the map.\nCurrent preference: ` +
						`${player.options.labels ? `${HexColors.GREEN}Visible` : `${HexColors.RED}Hidden`}`
				);
			}
		},
	});
}
