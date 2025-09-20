import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface GamePlant {
  'id' : bigint,
  'plantType' : string,
  'plantedAt' : bigint,
  'slot' : bigint,
  'stage' : bigint,
  'lastWatered' : bigint,
  'needsWater' : boolean,
}
export interface GamePlayer {
  'heatBalance' : bigint,
  'principal' : Principal,
  'plants' : Array<GamePlant>,
  'inventory' : Array<[string, bigint]>,
  'name' : string,
  'spicyBalance' : bigint,
  'level' : bigint,
  'experience' : bigint,
  'lastSaved' : bigint,
  'unlockedSeeds' : Array<string>,
}
export interface Plant {
  'id' : bigint,
  'growth' : bigint,
  'plantedAt' : bigint,
  'name' : string,
  'harvested' : boolean,
  'lastWatered' : bigint,
}
export interface Player {
  'principal' : Principal,
  'plants' : Array<Plant>,
  'name' : string,
  'coins' : bigint,
  'level' : bigint,
  'experience' : bigint,
  'lastAction' : bigint,
}
export interface _SERVICE {
  'ban_player' : ActorMethod<[Principal], string>,
  'buyGameItem' : ActorMethod<[string, bigint, string], string>,
  'getGameLeaderboard' : ActorMethod<[], Array<GamePlayer>>,
  'getGamePlayerData' : ActorMethod<[], [] | [GamePlayer]>,
  'get_game_stats' : ActorMethod<
    [],
    {
      'total_players' : bigint,
      'total_plants' : bigint,
      'total_coins' : bigint,
    }
  >,
  'get_game_status' : ActorMethod<[], string>,
  'get_player' : ActorMethod<[], [] | [Player]>,
  'harvestGamePlant' : ActorMethod<[bigint, bigint, bigint], string>,
  'harvest_plant' : ActorMethod<[bigint], string>,
  'initializeGamePlayer' : ActorMethod<[], boolean>,
  'leaderboard' : ActorMethod<[], Array<Player>>,
  'plantGameSeed' : ActorMethod<[bigint, string, bigint], string>,
  'plant_seed' : ActorMethod<[string], string>,
  'register_player' : ActorMethod<[string], string>,
  'reset_suspicious_activity' : ActorMethod<[Principal], string>,
  'saveGamePlayerData' : ActorMethod<
    [bigint, bigint, bigint, bigint, Array<GamePlant>, Array<[string, bigint]>],
    boolean
  >,
  'waterGamePlant' : ActorMethod<[bigint], string>,
  'water_plant' : ActorMethod<[bigint], string>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
