import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Plant {
  'id' : bigint,
  'growth' : bigint,
  'name' : string,
  'harvested' : boolean,
  'lastWatered' : bigint,
}
export interface Player {
  'principal' : Principal,
  'plants' : Array<Plant>,
  'name' : string,
  'coins' : bigint,
}
export interface _SERVICE {
  'get_game_status' : ActorMethod<[], string>,
  'get_player' : ActorMethod<[], [] | [Player]>,
  'harvest_plant' : ActorMethod<[bigint], boolean>,
  'leaderboard' : ActorMethod<[], Array<Player>>,
  'plant_seed' : ActorMethod<[string], bigint>,
  'register_player' : ActorMethod<[string], undefined>,
  'water_plant' : ActorMethod<[bigint], boolean>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
