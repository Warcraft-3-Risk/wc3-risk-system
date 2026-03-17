import { BotSkillContext } from './bot-skill-context';
import { debugPrint } from '../../../utils/debug-print';
import { DC } from 'src/configs/game-settings';
import { UNIT_ID } from 'src/configs/unit-id';
import { CityToCountry } from '../../../country/country-map';
import { City } from '../../../city/city';

const BOT_MAX_TRAINS_PER_THINK = 5;

export function economyStep(ctx: BotSkillContext): void {
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
		// No staging or no staging cities — fall back to border cities
		const borderCountries = ctx.territory.getBorderCountries();
		for (const city of ctx.cities) {
			const country = CityToCountry.get(city);
			if (country && borderCountries.has(country.getName())) {
				trainCities.push(city);
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
		if (IssueImmediateOrderById(city.barrack.unit, trainId)) {
			trainCount++;
		}
	}

	debugPrint(
		`[Bot] Slot ${ctx.playerId} economy: gold=${GetPlayerState(ctx.player, PLAYER_STATE_RESOURCE_GOLD)}, trained=${trainCount}/${BOT_MAX_TRAINS_PER_THINK}`,
		DC.bot
	);
	debugPrint(`[Bot] Slot ${ctx.playerId} unit count: ${ctx.units.size}`, DC.bot);
}
