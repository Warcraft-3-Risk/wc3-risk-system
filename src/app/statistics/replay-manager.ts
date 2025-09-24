import { MMD_ENABLED } from 'src/configs/game-settings';
import { record, pack } from 'src/app/libs/mmd';
import { GlobalGameData } from '../game/state/global-game-state';
import { NameManager } from '../managers/names/name-manager';
import { UNIT_ID } from 'src/configs/unit-id';
import { MAP_NAME } from '../utils/map-info';
import { ComputeRatio } from '../utils/utils';
import { SettingsContext } from '../settings/settings-context';
import { GameTypeOptions } from '../settings/strategies/game-type-strategy';
import { Settings } from '../settings/settings';
import { DiplomacyStrings } from '../settings/strategies/diplomacy-strategy';
import { FogStrings } from '../settings/strategies/fog-strategy';
import { PromodeOptions } from '../settings/strategies/promode-strategy';
import { OvertimeStrings } from '../settings/strategies/overtime-strategy';
import { StatisticsController } from './statistics-controller';

export class ReplayManager {
  private keys: Record<string, string> = {
    'income'      : 'i',
    'cities'      : 'c',
    'gold'        : 'g',
    'gold_earned' : 'G',
    'bounty'      : 'b',
    'bonus'       : 'B',
    'denies'      : 'n',
    'kills'       : 'k',
    'deaths'      : 'd',
    'kd'          : 'K',
    'ss_kills'    : 's',
    'ss_deaths'   : 'a',
    'ss_kd'       : 'S',
    'tank_kills'  : 't',
    'tank_deaths' : 'A',
    'tank_kd'     : 'T'
  };

  private static instance: ReplayManager;
  private initialized: boolean = false;
  public finalized: boolean[];

  public static getInstance(): ReplayManager {
    if (this.instance == null) {
      this.instance = new ReplayManager();
    }

    return this.instance;
  }

  public initialize (): void {
    if (!MMD_ENABLED) {
      return;
    }

    if (this.initialized) {
      return;
    }

    const settings: Settings = SettingsContext.getInstance().getSettings();

    let fields;
    
    fields = [];

    for (let [ key, value ] of Object.entries(this.keys)) {
      fields.push(`${value}=${key}`);
    }

    record(`meta keys ${fields.join(' ')}`);
    
    fields = [];

    fields.push(`map=${pack(MAP_NAME)}`);
    fields.push(`mode=${pack(GameTypeOptions[settings.GameType])}`);
    fields.push(`diplomacy=${pack(DiplomacyStrings[settings.Diplomacy.option])}`);
    fields.push(`fog=${pack(FogStrings[settings.Fog])}`);
    fields.push(`promode=${pack(PromodeOptions[settings.Promode])}`);
    fields.push(`overtime=${pack(OvertimeStrings[settings.Overtime.option])}`);

    record(`game ${fields.join(' ')}`);

    this.initialized = true;
  }

  public onRoundStart(): void {
    if(!MMD_ENABLED) {
      return;
    }

    this.finalized = [];

    if (GlobalGameData.matchCount <= 0) {
      return;
    }

    record(`game round=${GlobalGameData.matchCount}`);
  }

  public onTurnStart(): void {
    if(!MMD_ENABLED) {
      return;
    }

    // BJDebugMsg("Saving MMD snapshot");

    record(`game turn=${GlobalGameData.turnCount}`);
    
    this.snapshot ();
  }

  public onRoundEnd (): void {
    if(!MMD_ENABLED) {
      return;
    }

    this.snapshot();

    const model = StatisticsController.getInstance().getModel();
    
    const ranks = model.getRanks();

    for (let i = 0; i < ranks.length; i++) {
      const rank = ranks[i];
      const player = rank.getPlayer();
      const playerId = GetPlayerId(player);

      if (GetPlayerController(player) != MAP_CONTROL_USER) {
        continue;
      }

      record(`player ${playerId} placement=${i + 1}`);
    }

    GlobalGameData.matchPlayers.forEach((activePlayer) => {
      const player = activePlayer.getPlayer();
      const playerId = GetPlayerId(player);

      if (GetPlayerController(player) != MAP_CONTROL_USER) {
        return;
      }

      const rival = model.getRival(activePlayer);
      const rivalName = rival ? NameManager.getInstance().getBtag(rival.getPlayer()) : 'N/A';

      const fields = [];

      fields.push(`rival=${rivalName}`);
      fields.push(`turn_died=${activePlayer.trackedData.turnDied}`);

      record(`player ${playerId} ${fields.join (' ')}`);
    });
  }
  
  public snapshot (): void {
    if(!MMD_ENABLED) {
      return;
    }

    GlobalGameData.matchPlayers.forEach((activePlayer) => {
      const player = activePlayer.getPlayer();
      const playerId = GetPlayerId(player);
      
      if (GetPlayerController(player) != MAP_CONTROL_USER) {
        return;
      }

      if (activePlayer.status.isDead ()) {
        if (this.finalized[playerId]) {
          return;
        }

        // BJDebugMsg ("Finalizing player: " + playerId);

        this.finalized [playerId] = true;
      }

      const fields = [];

      fields.push(`${this.keys.income}=${activePlayer.trackedData.income.income}`);
      fields.push(`${this.keys.cities}=${activePlayer.trackedData.cities.cities.length}`);
      fields.push(`${this.keys.gold}=${GetPlayerState(player, PLAYER_STATE_RESOURCE_GOLD)}`);
      fields.push(`${this.keys.gold_earned}=${activePlayer.trackedData.gold.earned}`);
      fields.push(`${this.keys.bounty}=${activePlayer.trackedData.bounty.earned}`);
      fields.push(`${this.keys.bonus}=${activePlayer.trackedData.bonus.earned}`);
      fields.push(`${this.keys.denies}=${activePlayer.trackedData.denies}`);

      let bucket;
      let kills;
      let deaths;

      bucket = activePlayer.trackedData.killsDeaths.get (player);

      kills = bucket?.killValue ?? 0;
      deaths = bucket?.deathValue ?? 0;

      fields.push(`${this.keys.kills}=${kills}`);
      fields.push(`${this.keys.deaths}=${deaths}`);
      fields.push(`${this.keys.kd}=${ComputeRatio(kills, deaths)}`);

      bucket = activePlayer.trackedData.killsDeaths.get(`${UNIT_ID.BATTLESHIP_SS}`);

      kills = bucket?.killValue ?? 0;
      deaths = bucket?.deathValue ?? 0;

      fields.push(`${this.keys.ss_kills}=${kills}`);
      fields.push(`${this.keys.ss_deaths}=${deaths}`);
      fields.push(`${this.keys.ss_kd}=${ComputeRatio(kills, deaths)}`);

      bucket = activePlayer.trackedData.killsDeaths.get(`${UNIT_ID.TANK}`);
      
      kills = bucket?.killValue ?? 0;
      deaths = bucket?.deathValue ?? 0;

      fields.push(`${this.keys.tank_kills}=${kills}`);
      fields.push(`${this.keys.tank_deaths}=${deaths}`);
      fields.push(`${this.keys.tank_kd}=${ComputeRatio(kills, deaths)}`);

      record(`player ${playerId} ${fields.join (' ')}`);
    });
  }
}