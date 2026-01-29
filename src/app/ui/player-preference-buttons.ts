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
		xOffset: 0.0,
		textXOffset: 0.015,
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

export function buildSignalScopeButton(player: ActivePlayer): framehandle {
	return createGuardButton({
		player: player,
		createContext: GetPlayerId(player.getPlayer()) + 400,
		key: OSKEY_F3,
		textures: {
			primary: 'ReplaceableTextures\\CommandButtons\\BTNTelescope.blp',
			secondary: 'ReplaceableTextures\\CommandButtonsDisabled\\DISBTNTelescope.blp',
		},
		xOffset: 0.092,
		initialTooltipText: `Range Indicators ${HexColors.TANGERINE}(F3)|r\nToggles the permanent visibility of city range indicators (signal scopes).\nCurrent preference: ${HexColors.RED}Hidden`,
		action: (context: number, textures: { primary: string; secondary: string }) => {
			const { CityVisibilityManager } = require('../triggers/visuals/base-visibility');
			const isVisible = CityVisibilityManager.getInstance().togglePermanentVisibility(player.getPlayer());

			const buttonBackdrop = BlzGetFrameByName('GuardButtonBackdrop', context);
			const texture = isVisible ? textures.primary : textures.secondary;

			BlzFrameSetTexture(buttonBackdrop, texture, 0, false);

			const buttonTooltip = BlzGetFrameByName('GuardButtonToolTip', context);
			BlzFrameSetText(
				buttonTooltip,
				`Range Indicators ${HexColors.TANGERINE}(F3)|r\nToggles the permanent visibility of city range indicators (signal scopes).\nCurrent preference: ` +
					`${isVisible ? `${HexColors.GREEN}Visible` : `${HexColors.RED}Hidden`}`
			);
		},
	});
}

/**
 * Update the F4 rating stats button appearance based on ranked game status
 * Should be called after ranked status is determined in countdown phase
 * @param player The player whose button to update
 * @param isRanked Whether the game is ranked
 */
export function updateRatingStatsButtonForRankedStatus(player: ActivePlayer, isRanked: boolean): void {
	if (GetLocalPlayer() != player.getPlayer()) {
		return;
	}

	const buttonContext = GetPlayerId(player.getPlayer()) + 300;
	const buttonBackdrop = BlzGetFrameByName('GuardButtonBackdrop', buttonContext);
	const buttonTooltip = BlzGetFrameByName('GuardButtonToolTip', buttonContext);

	if (!buttonBackdrop) {
		return;
	}

	if (isRanked) {
		// For ranked games, show icon based on player's preference
		const { RatingManager } = require('src/app/rating/rating-manager');
		const { NameManager } = require('src/app/managers/names/name-manager');
		const ratingManager = RatingManager.getInstance();
		const btag = NameManager.getInstance().getBtag(player.getPlayer());
		const showRating = ratingManager.getShowRatingPreference(btag);

		const texture = showRating
			? 'ReplaceableTextures\\CommandButtons\\BTNMedalHeroism.blp'
			: 'ReplaceableTextures\\CommandButtonsDisabled\\DISBTNMedalHeroism.blp';
		BlzFrameSetTexture(buttonBackdrop, texture, 0, false);

		if (buttonTooltip) {
			const preferenceText = showRating ? `${HexColors.GREEN}Enabled` : `${HexColors.RED}Disabled`;
			BlzFrameSetText(
				buttonTooltip,
				`Ranked Stats ${HexColors.TANGERINE}(F4)|r\nView your ranked statistics and toggle ranked display in post-game stats.\nCurrent preference: ${preferenceText}`
			);
		}
	} else {
		// For unranked games, always show disabled icon
		BlzFrameSetTexture(
			buttonBackdrop,
			'ReplaceableTextures\\CommandButtonsDisabled\\DISBTNMedalHeroism.blp',
			0,
			false
		);

		if (buttonTooltip) {
			BlzFrameSetText(
				buttonTooltip,
				`Ranked Stats ${HexColors.TANGERINE}(F4)|r\n${HexColors.LIGHT_GRAY}Unavailable in unranked games.|r`
			);
		}
	}
}

export function buildRatingStatsButton(player: ActivePlayer): framehandle {
	return createGuardButton({
		player: player,
		createContext: GetPlayerId(player.getPlayer()) + 300,
		key: OSKEY_F4,
		textures: {
			primary: 'ReplaceableTextures\\CommandButtons\\BTNMedalHeroism.blp',
			secondary: 'ReplaceableTextures\\CommandButtonsDisabled\\DISBTNMedalHeroism.blp',
		},
		xOffset: 0.069,
		initialTooltipText: `Ranked Stats ${HexColors.TANGERINE}(F4)|r\nView your ranked statistics and toggle ranked display in post-game stats.\nCurrent preference: ${HexColors.GREEN}Enabled`,
		action: (context: number, textures: { primary: string; secondary: string }, button) => {
			if (GetLocalPlayer() == player.getPlayer()) {
				// Import RatingManager at runtime to check ranked status
				const { RatingManager } = require('src/app/rating/rating-manager');
				const ratingManager = RatingManager.getInstance();

				// Check if this is a ranked game - if not, show message and do nothing
				if (!ratingManager.isRankedGame()) {
					DisplayTimedTextToPlayer(
						player.getPlayer(),
						0,
						0,
						3,
						`${HexColors.TANGERINE}Ranked stats are unavailable in unranked games.|r`
					);
					return;
				}

				// Import RatingSyncManager at runtime to check sync status
				const { RatingSyncManager } = require('src/app/rating/rating-sync-manager');

				// Check if sync is complete before allowing UI access
				if (!RatingSyncManager.getInstance().isSyncComplete()) {
					// Show warning message and don't open UI (prevents desync)
					DisplayTimedTextToPlayer(
						player.getPlayer(),
						0,
						0,
						3,
						`${HexColors.TANGERINE}Rating data is still synchronizing...|r Please wait a moment.`
					);
					return;
				}

				player.ratingStatsUI.toggle();

				// Shift focus back to global context, so key events work properly (ESC, F4 etc.)
				BlzFrameSetEnable(button, false);
				BlzFrameSetEnable(button, true);
			}
		},
	});
}
