import { createGuardButton } from '../factory/guard-button-factory';
import { ActivePlayer } from '../player/types/active-player';
import { HexColors } from '../utils/hex-colors';
import { CityToCountry } from '../country/country-map';
import { Country } from '../country/country';
import { File } from 'w3ts';
import { UnitKillTracker } from '../managers/unit-kill-tracker';
import { UNIT_TYPE } from '../utils/unit-types';
import { UNIT_ID } from '../../configs/unit-id';

/**
 * Finds the closest country to a unit based on city COP (Circle of Power) positions.
 * More accurate than spawner distance since cities are distributed across countries.
 */
function getClosestCountry(u: unit): string {
	let closestCountry: string = 'Unknown';
	let closestDistance: number = 999999;

	const unitX = GetUnitX(u);
	const unitY = GetUnitY(u);

	// Check distance to all city COPs to find closest country
	for (const [city, country] of CityToCountry) {
		const copX = GetUnitX(city.cop);
		const copY = GetUnitY(city.cop);
		const dx = copX - unitX;
		const dy = copY - unitY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance < closestDistance) {
			closestDistance = distance;
			closestCountry = country.getName();
		}
	}

	return closestCountry;
}

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

export function buildKillCounterButton(player: ActivePlayer): framehandle {
	const context = GetPlayerId(player.getPlayer()) + 300;

	const button = createGuardButton({
		player: player,
		createContext: context,
		key: OSKEY_F9,
		textures: {
			primary: 'ReplaceableTextures\\CommandButtons\\BTNGeneralMedal.blp',
			secondary: 'ReplaceableTextures\\CommandButtons\\DISBTNGeneralMedal.blp',
		},
		xOffset: 0.069,
		initialTooltipText: `Unit Stats ${HexColors.TANGERINE}(F9)|r\nClick to display the top five units by kill count.`,
		action: () => {
			// Only show for local player
			if (GetLocalPlayer() !== player.getPlayer()) {
				return;
			}

			// Collect all units with kills across all players
			const unitsWithKills: Array<{ unit: unit; kills: number; owner: player }> = [];
			const tempGroup = CreateGroup();

			// Iterate through all players
			for (let i = 0; i < bj_MAX_PLAYERS; i++) {
				GroupEnumUnitsOfPlayer(tempGroup, Player(i), null);

				ForGroup(tempGroup, () => {
					const u = GetEnumUnit();
					// Exclude spawners, cities, and ports (immortal units)
					if (IsUnitType(u, UNIT_TYPE.SPAWN) || IsUnitType(u, UNIT_TYPE.CITY)) {
						return;
					}

					const kills = UnitKillTracker.getInstance().getKills(u);
					if (kills > 0) {
						unitsWithKills.push({ unit: u, kills: kills, owner: GetOwningPlayer(u) });
					}
				});

				GroupClear(tempGroup);
			}

			DestroyGroup(tempGroup);

			// Sort by kills (descending)
			unitsWithKills.sort((a, b) => b.kills - a.kills);

			// Display top 5
			const top5 = unitsWithKills.slice(0, 5);
			for (let i = 0; i < top5.length; i++) {
				const entry = top5[i];
				const ownerName = GetPlayerName(entry.owner);
				const unitName = GetUnitName(entry.unit);
				const location = getClosestCountry(entry.unit);

				DisplayTextToPlayer(
					player.getPlayer(),
					0,
					0,
					`${HexColors.TANGERINE}${i + 1}.${HexColors.WHITE} ${unitName} - ${location} - ${HexColors.RED}${entry.kills}${HexColors.WHITE} kills (${ownerName})`
				);

				// Create minimap ping at unit location
				PingMinimapEx(GetUnitX(entry.unit), GetUnitY(entry.unit), 4.0, 255, 165, 0, true);
			}

			if (top5.length === 0) {
				DisplayTextToPlayer(player.getPlayer(), 0, 0, `${HexColors.LIGHT_GRAY}No units with kills yet`);
			}
		},
	});

	// Start a timer to update the tooltip based on selected unit
	const updateTimer = CreateTimer();
	const tempGroup = CreateGroup();

	TimerStart(updateTimer, 0.1, true, () => {
		if (GetLocalPlayer() !== player.getPlayer()) {
			return;
		}

		// Get currently selected unit
		GroupClear(tempGroup);
		GroupEnumUnitsSelected(tempGroup, player.getPlayer(), null);
		const selectedUnit = BlzGroupGetSize(tempGroup) === 1 ? FirstOfGroup(tempGroup) : null;

		const buttonTooltip = BlzGetFrameByName('GuardButtonToolTip', context);

		if (!selectedUnit) {
			BlzFrameSetText(
				buttonTooltip,
				`Unit Stats ${HexColors.TANGERINE}(F9)|r\nClick to display the top five units by kill count.`
			);
			return;
		}

		// Don't show stats for spawners, spawner buildings, cities, or ports - just show default tooltip
		if (
			IsUnitType(selectedUnit, UNIT_TYPE.SPAWN) ||
			IsUnitType(selectedUnit, UNIT_TYPE.CITY) ||
			GetUnitTypeId(selectedUnit) === UNIT_ID.SPAWNER
		) {
			BlzFrameSetText(
				buttonTooltip,
				`Unit Stats ${HexColors.TANGERINE}(F9)|r\nClick to display the top five units by kill count.`
			);
			return;
		}

		// Get kills and calculate rank
		const kills = UnitKillTracker.getInstance().getKills(selectedUnit);
		const unitName = GetUnitName(selectedUnit);
		let rank: string;
		let rankColor: string;

		if (kills === 0) {
			rank = 'Recruit';
			rankColor = HexColors.LIGHT_GRAY;
		} else if (kills <= 4) {
			rank = 'Private';
			rankColor = HexColors.WHITE;
		} else if (kills <= 10) {
			rank = 'Corporal';
			rankColor = HexColors.LIGHT_BLUE;
		} else {
			rank = 'General';
			rankColor = HexColors.TANGERINE;
		}

		BlzFrameSetText(
			buttonTooltip,
			`Unit Stats ${HexColors.TANGERINE}(F9)|r\nClick to display the top five units by kill count.\n\n${unitName}\nKills: ${HexColors.RED}${kills}|r\nRank: ${rankColor}${rank}|r`
		);
	});

	return button;
}
