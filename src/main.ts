import { W3TS_HOOK, addScriptHook } from 'w3ts/hooks';
import { MAP_NAME } from './app/utils/map-info';
import { CountrySetup } from './app/country/country-setup';
import { GameStateManager } from './app/game/game-state-manager';
import { NameManager } from './app/names/name-manager';
import { HideDefaultUI } from './app/ui/console';

//const BUILD_DATE = compiletime(() => new Date().toUTCString());

/**
 * Anything in tsMain runs during the loading screen.
 * Anything in the 0 second timer will run when the game loads in
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

		//This timer will expire once loaded into game.
		const onLoadTimer: timer = CreateTimer();
		TimerStart(onLoadTimer, 1.0, false, () => {
			PauseTimer(onLoadTimer);
			DestroyTimer(onLoadTimer);
			HideDefaultUI(true);
			GameStateManager.getInstance();
		});
	} catch (e) {
		print(e);
	}
}

addScriptHook(W3TS_HOOK.MAIN_AFTER, tsMain);
addScriptHook(W3TS_HOOK.CONFIG_AFTER, () => {
	SetMapName(MAP_NAME);
});
