import { Country } from './country';
import { HexColors } from '../utils/hex-colors';
import { StringToCountry } from './country-map';
import { PlayerManager } from '../player/player-manager';

export class CountryLabelManager {
	private static instance: CountryLabelManager;
	private labels: Map<Country, framehandle> = new Map();
	private timer: timer;
	private initialized: boolean = false;

	static getInstance(): CountryLabelManager {
		if (this.instance === undefined) {
			this.instance = new CountryLabelManager();
		}
		return this.instance;
	}

	public setup(): void {
		if (this.initialized) return;
		this.initialized = true;

		const gameUI = BlzGetOriginFrame(ORIGIN_FRAME_GAME_UI, 0);

		let i = 0;
		for (const [, country] of StringToCountry) {
			const textFrame = BlzCreateFrameByType('TEXT', 'CountryLabelText', gameUI, 'EscMenuLabelTextTemplate', i);
			BlzFrameSetTextAlignment(textFrame, TEXT_JUSTIFY_CENTER, TEXT_JUSTIFY_MIDDLE);
			BlzFrameSetText(textFrame, `${HexColors.TANGERINE}${country.getName()} +${country.getCities().length}|r`);
			BlzFrameSetScale(textFrame, 1.0);
			BlzFrameSetVisible(textFrame, false);
			BlzFrameSetLevel(textFrame, 0);

			this.labels.set(country, textFrame);
			i++;
		}

		this.timer = CreateTimer();
		TimerStart(this.timer, 0.005, true, () => this.onTick());
	}

	private onTick(): void {
		const localPlayer = PlayerManager.getInstance().playersAndObservers.get(GetLocalPlayer());
		const showLabels = localPlayer ? localPlayer.options.labels : true;

		for (const [country, frame] of this.labels) {
			if (!showLabels) {
				BlzFrameSetVisible(frame, false);
				continue;
			}

			const spawnUnit = country.getSpawn().unit;

			const x = GetUnitX(spawnUnit) - 100;
			const y = GetUnitY(spawnUnit) - 300;
			const z = BlzGetUnitZ(spawnUnit);

			const [sx, sy, onScreen] = World2Screen(x, y, z);

			if (onScreen) {
				BlzFrameSetVisible(frame, true);
				BlzFrameSetAbsPoint(frame, FRAMEPOINT_BOTTOM, sx, sy);
			} else {
				BlzFrameSetVisible(frame, false);
			}
		}
	}
}
