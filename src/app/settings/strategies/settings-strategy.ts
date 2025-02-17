import { Settings } from '../settings';

export interface SettingsStrategy {
	apply(settings: Settings): void;
}
