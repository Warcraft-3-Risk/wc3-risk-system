import { BotSkillContext } from './bot-skill-context';
import { debugPrint } from '../../../utils/debug-print';
import { DC } from 'src/configs/game-settings';
import { UNIT_ID } from 'src/configs/unit-id';
import { CityToCountry, StringToCountry } from '../../../country/country-map';
import { City } from '../../../city/city';

const BOT_MAX_TRAINS_PER_THINK = 5;
const BOT_TRAINS_PER_CITY = 2;

export function economyStep(ctx: BotSkillContext): void {
	if (!ctx.campaign.currentTarget) return;

	let trainCount = 0;
	const stagingName = ctx.campaign.stagingCountry;

	// Determine which cities to train in based on campaign state
	const trainCities: City[] = [];

	if (stagingName) {
		// Active campaign: train only in staging country
		for (const city of ctx.cities) {
			const country = CityToCountry.get(city);
			if (country && country.getName() === stagingName) {
				trainCities.push(city);
			}
		}
	}

	if (trainCities.length === 0) {
		// No staging — concentrate in a single border country (the one with most owned cities)
		const borderCountries = ctx.territory.getBorderCountries();
		let bestCountryName: string | null = null;
		let bestOwnedCount = -1;

		for (const borderName of borderCountries) {
			const country = StringToCountry.get(borderName);
			if (!country) continue;
			let owned = 0;
			for (const c of country.getCities()) {
				if (c.getOwner() === ctx.player) owned++;
			}
			if (owned > bestOwnedCount) {
				bestOwnedCount = owned;
				bestCountryName = borderName;
			}
		}

		if (bestCountryName) {
			for (const city of ctx.cities) {
				const country = CityToCountry.get(city);
				if (country && country.getName() === bestCountryName) {
					trainCities.push(city);
				}
			}
		}
	}

	if (trainCities.length === 0) {
		// No border cities — train anywhere
		for (const city of ctx.cities) {
			trainCities.push(city);
		}
	}

	for (const city of trainCities) {
		if (trainCount >= BOT_MAX_TRAINS_PER_THINK) break;
		if (GetPlayerState(ctx.player, PLAYER_STATE_RESOURCE_GOLD) <= 0) break;
		const trainId = city.isPort() ? UNIT_ID.MARINE : UNIT_ID.RIFLEMEN;

		for (let i = 0; i < BOT_TRAINS_PER_CITY; i++) {
			if (trainCount >= BOT_MAX_TRAINS_PER_THINK) break;
			if (GetPlayerState(ctx.player, PLAYER_STATE_RESOURCE_GOLD) <= 0) break;
			if (IssueImmediateOrderById(city.barrack.unit, trainId)) {
				trainCount++;
			}
		}
	}

	debugPrint(
		`[Bot] Slot ${ctx.playerId} economy: gold=${GetPlayerState(ctx.player, PLAYER_STATE_RESOURCE_GOLD)}, trained=${trainCount}/${BOT_MAX_TRAINS_PER_THINK}`,
		DC.bot
	);
	debugPrint(`[Bot] Slot ${ctx.playerId} unit count: ${ctx.units.size}`, DC.bot);
}
