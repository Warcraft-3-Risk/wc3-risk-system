import { SettingsStrategy } from './settings-strategy';
import { HexColors } from 'src/app/utils/hex-colors';

export const RandomEventsStrings: Record<number, string> = {
	0: 'Off',
	1: 'On',
};

export const RandomEventsColors: Record<number, string> = {
	0: `${HexColors.GREEN}`,
	1: `${HexColors.RED}`,
};

export const RandomEventsStringsColorFormatted: Record<number, string> = {
	0: `${RandomEventsColors[0]}${RandomEventsStrings[0]}|r`,
	1: `${RandomEventsColors[1]}${RandomEventsStrings[1]}|r`,
};

export class RandomEventsStrategy implements SettingsStrategy {
	private readonly value: number;

	constructor(value: number) {
		this.value = value;
	}

	public apply(): void {
		// No side effects needed at strategy application time.
		// The setting is read at runtime via SettingsContext.isRandomEventsEnabled().
	}
}
