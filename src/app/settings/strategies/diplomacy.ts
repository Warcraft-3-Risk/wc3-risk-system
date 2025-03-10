import { HexColors } from 'src/app/utils/hex-colors';
import { Diplomacy } from '../settings';

export const DiplomacyOptions: Record<Diplomacy, string> = {
	[Diplomacy.FFA]: `${HexColors.GREEN}FFA`,
	[Diplomacy.DraftTeams]: `${HexColors.RED}Draft Teams`,
	[Diplomacy.RandomTeams]: `${HexColors.RED}Random Teams`,
};
