import { HexColors } from 'src/app/utils/hex-colors';
import { Fog } from '../settings';

export const FogOptions: Record<Fog, string> = {
	[Fog.Off]: `${HexColors.GREEN}Off`,
	[Fog.On]: `${HexColors.RED}On`,
	[Fog.Night]: `${HexColors.RED}Night`,
};
