import { HexColors } from 'src/app/utils/hex-colors';

export const OvertimeOptions: Record<number, string> = {
	0: `${HexColors.GREEN}Turn 30`,
	1: `${HexColors.RED}Turn 60`,
	2: `${HexColors.RED}Turn 120`,
	3: `${HexColors.RED}Off`,
};
