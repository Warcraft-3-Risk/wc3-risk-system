import { ActivePlayer } from 'src/app/player/types/active-player';
import { City } from 'src/app/city/city';
import { StateData } from 'src/app/game/game-mode/state/state-data';
import {
	EVENT_ON_PLAYER_ALIVE,
	EVENT_ON_PLAYER_DEAD,
	EVENT_ON_PLAYER_LEFT,
	EVENT_ON_PLAYER_NOMAD,
	EVENT_ON_PLAYER_STFU,
	EVENT_ON_PLAYER_FORFEIT,
	EVENT_ON_PLAYER_RESTART,
	EVENT_ON_CITY_CAPTURE,
	EVENT_ON_UNIT_KILLED,
	EVENT_ON_CITY_SELECTED,
	EVENT_ON_SWAP_GUARD,
	EVENT_ON_PRE_MATCH,
	EVENT_ON_IN_PROGRESS,
	EVENT_ON_POST_MATCH,
	EVENT_ON_START_MATCH,
	EVENT_ON_END_MATCH,
	EVENT_SET_GAME_MODE,
	EVENT_MODE_SELECTION,
	EVENT_START_GAME_LOOP,
	EVENT_QUEST_UPDATE_PLAYER_STATUS,
	EVENT_NEXT_STATE,
} from './event-constants';

/**
 * Typed event map for the game event system.
 * Maps event name constants to their expected argument tuples.
 *
 * Usage:
 *   emitter.on(EVENT_ON_PLAYER_DEAD, (player, forfeit) => { ... });
 *   emitter.emit(EVENT_ON_PLAYER_DEAD, somePlayer, true);
 *
 * TypeScript will enforce that emit() and on() agree on argument types.
 */
export interface GameEventMap {
	[EVENT_ON_PLAYER_ALIVE]: [player: ActivePlayer];
	[EVENT_ON_PLAYER_DEAD]: [player: ActivePlayer, forfeit?: boolean];
	[EVENT_ON_PLAYER_LEFT]: [player: ActivePlayer];
	[EVENT_ON_PLAYER_NOMAD]: [player: ActivePlayer];
	[EVENT_ON_PLAYER_STFU]: [player: ActivePlayer];
	[EVENT_ON_PLAYER_FORFEIT]: [player: ActivePlayer];
	[EVENT_ON_PLAYER_RESTART]: [player: ActivePlayer];
	[EVENT_ON_CITY_CAPTURE]: [city: City, prevOwner: ActivePlayer, owner: ActivePlayer];
	[EVENT_ON_UNIT_KILLED]: [killingUnit: unit, dyingUnit: unit];
	[EVENT_ON_CITY_SELECTED]: [city: City, player: player];
	[EVENT_ON_SWAP_GUARD]: [targetedUnit: unit, city: City, triggerPlayer: player];
	[EVENT_ON_PRE_MATCH]: [];
	[EVENT_ON_IN_PROGRESS]: [];
	[EVENT_ON_POST_MATCH]: [];
	[EVENT_ON_START_MATCH]: [];
	[EVENT_ON_END_MATCH]: [];
	[EVENT_SET_GAME_MODE]: [gameType: number];
	[EVENT_MODE_SELECTION]: [];
	[EVENT_START_GAME_LOOP]: [];
	[EVENT_QUEST_UPDATE_PLAYER_STATUS]: [];
	[EVENT_NEXT_STATE]: [data?: StateData];
}
