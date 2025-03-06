import { MatchData } from 'src/app/game/state/game-state';
import { HexColors } from 'src/app/utils/hex-colors';
import { PlayGlobalSound } from 'src/app/utils/utils';

/**
 * Update the UI elements related to the timer.
 */
export function updateTickUI(): void {
	let tick: string = `${MatchData.tickCounter}`;

	if (MatchData.tickCounter <= 3) {
		tick = `${HexColors.RED}${MatchData.tickCounter}|r`;
		PlayGlobalSound('Sound\\Interface\\BattleNetTick.flac');
	}

	BlzFrameSetText(BlzGetFrameByName('ResourceBarUpkeepText', 0), tick);
	BlzFrameSetText(BlzGetFrameByName('ResourceBarSupplyText', 0), `${MatchData.turnCount}`);
}
