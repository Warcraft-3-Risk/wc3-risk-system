import { BotSkillContext } from './bot-skill-context';
import { debugPrint } from '../../../utils/debug-print';
import { DC } from 'src/configs/game-settings';
import { UNIT_ID } from 'src/configs/unit-id';

const BOT_MAX_TRAINS_PER_THINK = 5;

export function economyStep(ctx: BotSkillContext): void {
	let trainCount = 0;

	for (const city of ctx.cities) {
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
