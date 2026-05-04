import { Country } from '../country/country';
import { HexColors } from '../utils/hex-colors';
import { PlayerManager } from '../player/player-manager';

export class CountryLabelManager {
	private static instance: CountryLabelManager;
	private labels: texttag[] = [];
	private maxLabels: number = 75; // Safe limit out of 100 handles
	private updateTimer: timer | undefined;
	private allCountries: Country[] = [];

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

		// Map countries to their distances locally
		const distances = this.allCountries.map((country) => {
			const spawnUnit = country.getSpawn().unit;
			const cx = GetUnitX(spawnUnit) - 100;
			const cy = GetUnitY(spawnUnit) - 300;
			const dx = targetX - cx;
			const dy = targetY - cy;
			return {
				country,
				cx,
				cy,
				distSq: dx * dx + dy * dy,
				textData: `${HexColors.TANGERINE} ${country.getName()} +${country.getCities().length} `,
				nameLength: country.getName().length,
			};
		});

		// Sort by nearest distance
		distances.sort((a, b) => a.distSq - b.distSq);

		// Render the closest N labels
		const activeCount = Math.min(this.maxLabels, distances.length);

		let labelIndex = 0;
		while (labelIndex < activeCount) {
			const data = distances[labelIndex];
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
