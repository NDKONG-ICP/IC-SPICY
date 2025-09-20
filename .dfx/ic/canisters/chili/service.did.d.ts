import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface ChiliFact {
  'id' : bigint,
  'title' : string,
  'source' : string,
  'fact' : string,
  'timestamp' : bigint,
  'category' : string,
}
export interface ChiliNFT {
  'id' : bigint,
  'image_url' : [] | [string],
  'owner' : Principal,
  'name' : string,
  'heat_level' : bigint,
  'description' : string,
  'attributes' : Array<string>,
  'rarity' : string,
  'variety' : string,
  'minted_at' : bigint,
}
export interface ChiliVariety {
  'shu' : bigint,
  'fruit_size' : string,
  'days_to_maturity' : bigint,
  'name' : string,
  'origin' : string,
  'growing_difficulty' : string,
  'flavor_profile' : string,
  'plant_height' : string,
}
export interface _SERVICE {
  'addChiliFact' : ActorMethod<[string, string, string, string], bigint>,
  'getAllChiliNFTs' : ActorMethod<[], Array<ChiliNFT>>,
  'getChiliFacts' : ActorMethod<[], Array<ChiliFact>>,
  'getChiliNFT' : ActorMethod<[bigint], [] | [ChiliNFT]>,
  'getChiliStats' : ActorMethod<
    [],
    {
      'total_varieties' : bigint,
      'total_nfts' : bigint,
      'total_owners' : bigint,
      'total_facts' : bigint,
    }
  >,
  'getChiliVarieties' : ActorMethod<[], Array<ChiliVariety>>,
  'getChiliVariety' : ActorMethod<[string], [] | [ChiliVariety]>,
  'getNFTsByRarity' : ActorMethod<[string], Array<ChiliNFT>>,
  'getNFTsByVariety' : ActorMethod<[string], Array<ChiliNFT>>,
  'getUserChiliNFTs' : ActorMethod<[Principal], Array<ChiliNFT>>,
  'mintChiliNFT' : ActorMethod<
    [string, string, bigint, string, string, [] | [string], Array<string>],
    bigint
  >,
  'transferChiliNFT' : ActorMethod<[bigint, Principal], boolean>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
