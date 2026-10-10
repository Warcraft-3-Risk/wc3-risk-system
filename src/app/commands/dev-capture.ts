import { City } from '../city/city';
import { RegionToCity } from '../city/city-map';
import { CityToCountry } from '../country/country-map';
import { GlobalGameData } from '../game/state/global-game-state';
import { ChatManager } from '../managers/chat-manager';
import { NameManager } from '../managers/names/name-manager';
import { PlayerManager } from '../player/player-manager';
import { HexColors } from '../utils/hex-colors';
import { ErrorMsg } from '../utils/messages';
import { GetRandomElementFromArray, NEUTRAL_HOSTILE, isNonEmptySubstring } from '../utils/utils';
import { EDITOR_DEVELOPER_MODE } from 'src/configs/game-settings';

// Hard ceiling so a typo like "-dcap blue 999" cannot hand over the entire map in one go.
const MAX_CITIES_PER_COMMAND: number = 10;

/**
 * Collects every city still held by neutral hostile.
 */
function getNeutralCities(): City[] {
	const result: City[] = [];

	RegionToCity.forEach((city) => {
		if (city.getOwner() == NEUTRAL_HOSTILE) result.push(city);
	});

	return result;
}

/**
 * Resolves a player by colour name or battle tag, across all players rather than just allies.
 */
function getAnyPlayerByName(search: string, nameManager: NameManager): player[] {
	const found: Set<player> = new Set<player>();

	for (let i = 0; i < bj_MAX_PLAYERS; i++) {
		const candidate: player = Player(i);

		if (GetPlayerSlotState(candidate) != PLAYER_SLOT_STATE_PLAYING) continue;
		if (IsPlayerObserver(candidate)) continue;

		if (isNonEmptySubstring(search, nameManager.getColor(candidate))) found.add(candidate);
		if (isNonEmptySubstring(search, nameManager.getBtag(candidate))) found.add(candidate);
	}

	return [...found];
}

/**
 * Hands a random neutral city to a chosen player, the same way distribution does: the barracks,
 * circle of power and guard all change hands, which fires the normal ownership change event so
 * income, scoreboard, country ownership and capture sounds all behave as if it were a real
 * capture.
 *
 * Testing aid only - the command is never registered unless EDITOR_DEVELOPER_MODE is on. It
 * exists to reproduce an enemy capture in a place the tester cannot see, which is otherwise
 * awkward to stage on your own.
 *
 * Usage: -dcap <player> [count]   e.g. "-dcap blue" or "-dcap blue 3"
 */
export function DevCaptureCommand(chatManager: ChatManager, nameManager: NameManager) {
	if (!EDITOR_DEVELOPER_MODE) return;

	chatManager.addCmd(['-dcap', '-devcapture'], () => {
		const sender: player = GetTriggerPlayer();

		if (GlobalGameData.matchState != 'inProgress') return ErrorMsg(sender, 'The match has not started yet!');

		const splitStr: string[] = GetEventPlayerChatString()
			.split(' ')
			.filter((str) => str.trim() !== '');

		if (splitStr.length < 2) return ErrorMsg(sender, 'Usage: -dcap <player> [count]', 5);

		const targets: player[] = getAnyPlayerByName(splitStr[1], nameManager);

		if (targets.length >= 2) return ErrorMsg(sender, 'Multiple players found, be more specific!');
		if (targets.length <= 0) return ErrorMsg(sender, 'Player not found!');

		const target: player = targets[0];
		const requested: number = splitStr.length >= 3 ? S2I(splitStr[2]) : 1;
		const count: number = Math.max(1, Math.min(requested, MAX_CITIES_PER_COMMAND));

		const neutralCities: City[] = getNeutralCities();

		if (neutralCities.length == 0) return ErrorMsg(sender, 'There are no neutral cities left!');

		const captured: string[] = [];

		for (let i = 0; i < count; i++) {
			const city: City = GetRandomElementFromArray(neutralCities);

			if (!city) break;

			// Mirrors StandardDistributionService.changeCityOwner - setOwner moves the barracks and
			// circle of power, and the guard is handed over separately.
			city.setOwner(target);
			SetUnitOwner(city.guard.unit, target, true);

			// Distribution tracks the guard it hands over, so do the same or the new owner's unit
			// count drifts.
			const owner = PlayerManager.getInstance().players.get(target);

			if (owner) owner.trackedData.units.add(city.guard.unit);

			captured.push(CityToCountry.get(city).getName());
		}

		DisplayTextToPlayer(
			sender,
			0,
			0,
			`Gave ${HexColors.TANGERINE}${captured.length}|r neutral ${captured.length == 1 ? 'city' : 'cities'} to ${nameManager.getDisplayName(target)}|r (${captured.join(', ')})`
		);
	});
}
