import { HexColors } from 'src/app/utils/hex-colors';
import { Overtime } from '../settings';

export const OvertimeOptions: Record<Overtime, string> = {
	[Overtime.Turn30]: `${HexColors.GREEN}Turn 30`,
	[Overtime.Turn60]: `${HexColors.RED}Turn 60`,
	[Overtime.Turn120]: `${HexColors.RED}Turn 120`,
	[Overtime.Off]: `${HexColors.RED}Off`,
};
