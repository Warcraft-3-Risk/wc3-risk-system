import { Country } from '../country/country';
import { PlayerManager } from '../player/player-manager';
import { City } from '../city/city';
import { type LabelMode } from '../player/options';
import { CityLabelText, createCityLabelText } from './city-label-text';
import { createCountryLabelText } from './country-label-text';

interface CountryLabelData {
	country: Country;
	cx: number;
	cy: number;
	distSq: number;
	textData: string;
	textLength: number;
}

interface CityLabelData {
	city: City;
	cx: number;
	cy: number;
	distSq: number;
	nameText: CityLabelText;
	fullText: CityLabelText;
	noPositionText: CityLabelText;
}

export class CountryLabelManager {
	private static instance: CountryLabelManager;
	private labels: texttag[] = [];
	private cityLabels: texttag[] = [];
	private maxCountryLabels: number = 25;
	private maxCityLabels: number = 50;
	private updateTimer: timer | undefined;
	private allCountries: Country[] = [];
	private allCities: City[] = [];
	private labelDataCache: CountryLabelData[] = [];
	private cityLabelDataCache: CityLabelData[] = [];

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
		this.allCities = [];

		for (const country of this.allCountries) {
			for (const city of country.getCities()) {
				this.allCities.push(city);
			}
		}

		// Pre-allocate the data cache to avoid GC churn
		this.labelDataCache = this.allCountries.map((country) => ({
			country,
			cx: 0,
			cy: 0,
			distSq: 0,
			textData: '',
			textLength: country.getName().length,
		}));

		this.cityLabelDataCache = this.allCities.map((city) => {
			return {
				city,
				cx: 0,
				cy: 0,
				distSq: 0,
				nameText: createCityLabelText(city, 'cityName'),
				fullText: createCityLabelText(city, 'all'),
				noPositionText: createCityLabelText(city, 'cityQuality'),
			};
		});

		// Initialize the pools. Country + city labels intentionally stay at 75 total handles.
		for (let i = this.labels.length; i < this.maxCountryLabels; i++) {
			this.labels.push(CreateTextTag());
		}

		for (let i = this.cityLabels.length; i < this.maxCityLabels; i++) {
			this.cityLabels.push(CreateTextTag());
		}

		if (!this.updateTimer) {
			this.updateTimer = CreateTimer();
			TimerStart(this.updateTimer, 0.4, true, () => {
				this.update();
			});
		}
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

		const labelMode = localPlayer ? localPlayer.options.labelMode || 'cityName' : 'cityName';

		// If disabled, hide everything and return
		if (labelMode === 'none') {
			this.hideLabels(this.labels);
			this.hideLabels(this.cityLabels);
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

			const labelText = createCountryLabelText(
				{
					name: data.country.getName(),
					cityCount: data.country.getCities().length,
				},
				labelMode
			);

			data.distSq = dx * dx + dy * dy;
			data.textData = labelText.text;
			data.textLength = labelText.visibleLength;
		}

		// Sort by nearest distance
		this.labelDataCache.sort((a, b) => a.distSq - b.distSq);

		this.renderCountryLabels();
		if (labelMode === 'cityName' || labelMode === 'cityQuality' || labelMode === 'all') {
			this.renderCityLabels(targetX, targetY, labelMode);
		} else {
			this.hideLabels(this.cityLabels);
		}
	}

	private renderCountryLabels(): void {
		const activeCount = Math.min(this.maxCountryLabels, this.labelDataCache.length);
		let labelIndex = 0;

		while (labelIndex < activeCount) {
			const data = this.labelDataCache[labelIndex];
			const tag = this.labels[labelIndex];

			const lengthCheck: number = data.textLength * 5.5 < 200 ? data.textLength * 5.5 : 200;

			// All properties of TextTag can be modified locally with no desync
			SetTextTagText(tag, data.textData, 0.028);
			SetTextTagPos(tag, data.cx - lengthCheck, data.cy, 16.0);
			SetTextTagVisibility(tag, true);

			labelIndex++;
		}

		// Hide the rest of the pool
		while (labelIndex < this.maxCountryLabels) {
			SetTextTagVisibility(this.labels[labelIndex], false);
			labelIndex++;
		}
	}

	private renderCityLabels(targetX: number, targetY: number, labelMode: LabelMode): void {
		for (let i = 0; i < this.cityLabelDataCache.length; i++) {
			const data = this.cityLabelDataCache[i];
			const city = data.city;

			data.cx = city.barrack.defaultX;
			data.cy = city.barrack.defaultY + 170;

			const dx = targetX - data.cx;
			const dy = targetY - data.cy;

			data.distSq = dx * dx + dy * dy;
		}

		this.cityLabelDataCache.sort((a, b) => a.distSq - b.distSq);

		const activeCount = Math.min(this.maxCityLabels, this.cityLabelDataCache.length);
		let labelIndex = 0;

		while (labelIndex < activeCount) {
			const data = this.cityLabelDataCache[labelIndex];
			const tag = this.cityLabels[labelIndex];
			const labelText = this.getCityLabelText(data, labelMode);

			const lengthCheck: number = labelText.visibleLength * 2.6 < 125 ? labelText.visibleLength * 2.6 : 125;

			SetTextTagText(tag, labelText.text, 0.014);
			SetTextTagPos(tag, data.cx - lengthCheck, data.cy, 16.0);
			SetTextTagVisibility(tag, true);

			labelIndex++;
		}

		while (labelIndex < this.maxCityLabels) {
			SetTextTagVisibility(this.cityLabels[labelIndex], false);
			labelIndex++;
		}
	}

	private getCityLabelText(data: CityLabelData, labelMode: LabelMode): CityLabelText {
		if (labelMode === 'cityName') {
			return data.nameText;
		}

		if (labelMode === 'cityQuality') {
			return data.noPositionText;
		}

		return data.fullText;
	}

	private hideLabels(labels: texttag[]): void {
		for (let i = 0; i < labels.length; i++) {
			SetTextTagVisibility(labels[i], false);
		}
	}
}
