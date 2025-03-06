import { W3TS_HOOK, addScriptHook } from 'w3ts/hooks';
import { MAP_NAME } from './app/utils/map-info';
import { CityBuilder } from './app/city/builder/city-builder';
import { SetCountries } from './configs/city-country-setup';
import { NameManager } from './app/managers/names/name-manager';
import { GameStateManager } from './app/game/game-manager';
import { ICountryData } from './app/country/builder/country-data.interface';
import { CountryBuilder } from './app/country/builder/country-builder';
import { SpawnerBuilder } from './app/spawner/builder/spawner-builder';
import { CityBehaviorRegistry } from './app/city/behaviors/city.behavior-registry';
import { LandCityBehavior } from './app/city/behaviors/land-city-behavior';
import { PortCityBehavior } from './app/city/behaviors/port-city-behavior';
import { CityType } from './app/city/city-type';
import { CountrySetup } from './app/country/country-setup';

//const BUILD_DATE = compiletime(() => new Date().toUTCString());

/**
 * tsMain calls wc3 main().
 * Anything in tsMain runs during the loading screen.
 * Anything in the 0 seconds timer will run when the game loads in
 */
function tsMain() {
	try {
		//Load dependancies
		if (!BlzLoadTOCFile('war3mapimported\\Risk.toc')) {
			print('Failed to load TOC file!');
			return;
		}

		if (!BlzChangeMinimapTerrainTex('minimap.blp')) {
			print('Failed to load minimap file!');
			return;
		}

		//Set up map settings
		SetGameSpeed(MAP_SPEED_FASTEST);
		SetMapFlag(MAP_LOCK_SPEED, true);
		SetMapFlag(MAP_LOCK_ALLIANCE_CHANGES, false);
		SetTimeOfDay(12.0);
		SetTimeOfDayScale(0.0);
		SetAllyColorFilterState(0);
		//Set up countries
		CountrySetup();
		//Change and save names to prevent namebug.
		NameManager.getInstance();
		//Set up triggers

		//Set up actions on game load
		const onLoadTimer: timer = CreateTimer();
		TimerStart(onLoadTimer, 0.0, false, () => {
			PauseTimer(onLoadTimer);
			DestroyTimer(onLoadTimer);

			GameStateManager.getInstance().start();
		});
	} catch (e) {
		print(e);
	}
}

addScriptHook(W3TS_HOOK.MAIN_AFTER, tsMain);
addScriptHook(W3TS_HOOK.CONFIG_AFTER, () => {
	SetMapName(MAP_NAME);
});
