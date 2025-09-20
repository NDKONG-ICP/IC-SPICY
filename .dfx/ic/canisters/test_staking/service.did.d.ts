import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface StakePosition {
  'apy' : number,
  'unstaked' : boolean,
  'principal' : Principal,
  'last_claimed' : bigint,
  'lock_months' : bigint,
  'staked_at' : bigint,
  'rewards' : bigint,
  'amount' : bigint,
}
export interface _SERVICE {
  'claim_rewards' : ActorMethod<[], string>,
  'get_stake' : ActorMethod<[], [] | [StakePosition]>,
  'list_stakers' : ActorMethod<[], Array<StakePosition>>,
  'stake' : ActorMethod<[bigint, bigint], string>,
  'unstake' : ActorMethod<[], string>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
