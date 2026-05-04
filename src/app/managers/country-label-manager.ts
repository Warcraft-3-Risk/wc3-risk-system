import { Country } from '../country/country';
import { HexColors } from '../utils/hex-colors';
import { PlayerManager } from '../player/player-manager';

interface CountryLabelData {
	country: Country;
	cx: number;
	cy: number;
	distSq: number;
	textData: string;
	nameLength: number;
}

export class CountryLabelManager {
	private static instance: CountryLabelManager;
	private labels: texttag[] = [];
	private maxLabels: number = 75; // Safe limit out of 100 handles
	private updateTimer: timer | undefined;
	private allCountries: Country[] = [];
	private labelDataCache: CountryLabelData[] = [];

	private constructor() {
		// Private constructor for singleton
	}

	public static getInstance(): CountryLabelManager {
		if (!this.instance) {
			this.instance = new CountryLabelManager();
		}
		return this.instance;
	}

	/**
	 * Initializes the label pool and starts the distance-based update loop.
	 * Should be called after all countries have been built.
	 */
	public initialize(countries: Country[]) {
		this.allCountries = countries;

		// Pre-allocate the data cache to avoid GC churn
		this.labelDataCache = this.allCountries.map((country) => ({
			country,
			cx: 0,
			cy: 0,
			distSq: 0,
			textData: '',
			nameLength: country.getName().length,
		}));

		// Initialize the pool
		for (let i = 0; i < this.maxLabels; i++) {
			this.labels.push(CreateTextTag());
		}

		this.updateTimer = CreateTimer();
		TimerStart(this.updateTimer, 0.4, true, () => {
			this.update();
		});
	}

	/**
	 * Forces an immediate visual update.
	 */
	public forceUpdate(): void {
		this.update();
	}

	private update() {
		const localPlayerHandle = GetLocalPlayer();
		const localPlayer = PlayerManager.getInstance().playersAndObservers.get(localPlayerHandle);

		// Check if local player has labels disabled
		const isLabelsEnabled = localPlayer ? localPlayer.options.labels : true;

		// If disabled, hide everything and return
		if (!isLabelsEnabled) {
			for (let i = 0; i < this.maxLabels; i++) {
				SetTextTagVisibility(this.labels[i], false);
			}
			return;
		}

		// Calculate local player's camera position
		const targetX = GetCameraTargetPositionX();
		const targetY = GetCameraTargetPositionY();

		// Update distances matching the cache without generating new objects (zero GC churn)
		for (let i = 0; i < this.labelDataCache.length; i++) {
			const data = this.labelDataCache[i];
			const spawnUnit = data.country.getSpawn().unit;

			data.cx = GetUnitX(spawnUnit) - 100;
			data.cy = GetUnitY(spawnUnit) - 300;
			const dx = targetX - data.cx;
			const dy = targetY - data.cy;

			data.distSq = dx * dx + dy * dy;
			data.textData = `${HexColors.TANGERINE} ${data.country.getName()} +${data.country.getCities().length} `;
		}

		// Sort by nearest distance
		this.labelDataCache.sort((a, b) => a.distSq - b.distSq);

		// Render the closest N labels
		const activeCount = Math.min(this.maxLabels, this.labelDataCache.length);

		let labelIndex = 0;
		while (labelIndex < activeCount) {
			const data = this.labelDataCache[labelIndex];
			const tag = this.labels[labelIndex];

			const lengthCheck: number = data.nameLength * 5.5 < 200 ? data.nameLength * 5.5 : 200;

			// All properties of TextTag can be modified locally with no desync
			SetTextTagText(tag, data.textData, 0.028);
			SetTextTagPos(tag, data.cx - lengthCheck, data.cy, 16.0);
			SetTextTagVisibility(tag, true);

			labelIndex++;
		}

		// Hide the rest of the pool
		while (labelIndex < this.maxLabels) {
			SetTextTagVisibility(this.labels[labelIndex], false);
			labelIndex++;
		}
	}
}
