import { W3TS_HOOK, addScriptHook } from 'w3ts/hooks';
import { MAP_NAME, W3C_MODE_ENABLED } from './app/utils/map-info';
import { ConcreteCityBuilder } from './app/city/concrete-city-builder';
import { ConcreteCountryBuilder } from './app/country/concrete-country-builder';
import { CountrySettings } from './app/country/countries';
import { ConcreteSpawnerBuilder } from './app/spawner/concrete-spawn-builder';
import { SetCountries } from './configs/city-country-setup';
import { NameManager } from './app/managers/names/name-manager';
import { ChatManager } from './app/managers/chat-manager';
import { TransportManager } from './app/managers/transport-manager';
import { SetConsoleUI } from './app/ui/console';
import { OwnershipChangeEvent } from './app/triggers/ownership-change-event';
import { EnterRegionEvent } from './app/triggers/enter-region-event';
import { LeaveRegionEvent } from './app/triggers/leave-region-event';
import { SpellEffectEvent } from './app/triggers/spell-effect-event';
import { PlayerLeaveEvent } from './app/triggers/player-leave-event';
import { UnitDeathEvent } from './app/triggers/unit_death/unit-death-event';
import { UnitTrainedEvent } from './app/triggers/unit-trained-event';
import { KeyEvents } from './app/triggers/key-events';
import { Quests } from './app/quests/quests';
import CameraManager from './app/managers/camera-manager';
import { TimedEventManager } from './app/libs/timer/timed-event-manager';
import { AntiSpam } from './app/triggers/anti-spam';
import { SetCommands } from './app/commands/commands';
import { ExportShuffledPlayerList } from './app/utils/export-statistics/export-shuffled-player-list';
import { ModeSelection } from './app/game/mode-selection';
import { PlayerSetupService } from './app/game/services/player-setup-service';
import { EventCoordinator } from './app/game/event-coordinator';
import { EventEmitter } from './app/utils/events/event-emitter';
import { EVENT_MODE_SELECTION } from './app/utils/events/event-constants';
import { CitySelectedEvent } from './app/triggers/city-selected-event';
import { UnitUpgradeEvent } from './app/triggers/unit-upgrade-event';
import { ENABLE_EXPORT_SHUFFLED_PLAYER_LIST } from './configs/game-settings';
import { clearTickUI } from './app/game/game-mode/utillity/update-ui';
import { FogManager } from './app/managers/fog-manager';
import { LocalMessage } from './app/utils/messages';

//const BUILD_DATE = compiletime(() => new Date().toUTCString());

function tsMain() {
	try {
		if (!BlzLoadTOCFile('war3mapimported\\Risk.toc')) {
			print('Failed to load TOC file!');
			return;
		}

		if (!BlzChangeMinimapTerrainTex('minimap.blp')) {
			print('Failed to load minimap file!');
			return;
		}

		SetGameSpeed(MAP_SPEED_FASTEST);
		SetMapFlag(MAP_LOCK_SPEED, true);
		SetMapFlag(MAP_USE_HANDICAPS, false);
		SetMapFlag(MAP_LOCK_ALLIANCE_CHANGES, false);
		SetTimeOfDay(12.0);
		SetTimeOfDayScale(0.0);
		SetAllyColorFilterState(0);

		//Handle names to prevent namebug
		NameManager.getInstance();

		//Set up countries
		SetCountries();
		// SetRegions();
		//Build countries, spawners, and cities
		const countryBuilder = new ConcreteCountryBuilder();
		const cityBuilder = new ConcreteCityBuilder();
		const spawnerBuilder = new ConcreteSpawnerBuilder();

		for (const country of CountrySettings) {
			countryBuilder.setName(country.name);
			country.cities.forEach((city) => {
				countryBuilder.addCity(city, cityBuilder, country.guardType);
			});

			countryBuilder.setSpawn(country.spawnerData, spawnerBuilder);
			countryBuilder.build();
		}
		//Build regions
		// const regionBuilder = new ConcreteRegionBuilder();

		// for (const region of RegionSettings) {
		// 	region.countryNames.forEach((countryName) => {
		// 		const country = StringToCountry.get(countryName);
		// 		regionBuilder.addCountry(country);
		// 	});

		// 	regionBuilder.setGoldBonus(region.goldBonus);
		// 	regionBuilder.build();
		// }

		//Set up triggers
		EnterRegionEvent();
		LeaveRegionEvent();
		UnitDeathEvent();
		UnitTrainedEvent();
		UnitUpgradeEvent();
		OwnershipChangeEvent();
		PlayerLeaveEvent();
		SpellEffectEvent();
		AntiSpam();
		KeyEvents();
		CitySelectedEvent();

		//Create Quests
		Quests.getInstance().Create();

		//Set up actions on game load
		const onLoadTimer: timer = CreateTimer();

		TimerStart(onLoadTimer, 0.0, false, () => {
			clearTickUI();
			PauseTimer(onLoadTimer);
			DestroyTimer(onLoadTimer);
			FogEnable(false);
			FogMaskEnable(false);
			SetConsoleUI();
			CameraManager.getInstance();
			ChatManager.getInstance();
			TransportManager.getInstance();
			TimedEventManager.getInstance();
			SetCommands();

			new PlayerSetupService().run();

			EnableSelect(false, false);
			EnableDragSelect(false, false);
			FogManager.getInstance().turnFogOff();

			EventEmitter.getInstance();
			EventCoordinator.getInstance();
			ModeSelection.getInstance();

			Quests.getInstance().AddShuffledPlayerListQuest();

			//Export statistics
			if (ENABLE_EXPORT_SHUFFLED_PLAYER_LIST) {
				ExportShuffledPlayerList.write();
			}

			EventEmitter.getInstance().emit(EVENT_MODE_SELECTION);

			if (W3C_MODE_ENABLED) {
				LocalMessage(
					GetLocalPlayer(),
					'Welcome to Risk Europe!\n\nThis is a best of 3 matchup. First to win 2 matches is victorious!\n\nBuild armies and capture countries to increase your income!\n\nPrevent your opponent from doing the same!\n\nGood luck and have fun!',
					'Sound\\Interface\\ItemReceived.flac',
					18
				);
			}
		});
	} catch (e) {
		print(e);
	}
}

addScriptHook(W3TS_HOOK.MAIN_AFTER, tsMain);
addScriptHook(W3TS_HOOK.CONFIG_AFTER, () => {
	SetMapName(MAP_NAME);
});
