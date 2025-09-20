import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Proposal {
  'id' : bigint,
  'title' : string,
  'creator' : Principal,
  'executed_at' : [] | [bigint],
  'description' : string,
  'created_at' : bigint,
  'votes_for' : bigint,
  'executed' : boolean,
  'votes_against' : bigint,
}
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
  'create_proposal' : ActorMethod<[string, string], bigint>,
  'execute_proposal' : ActorMethod<[bigint], string>,
  'get_proposal' : ActorMethod<[bigint], [] | [Proposal]>,
  'get_stake' : ActorMethod<[], [] | [StakePosition]>,
  'list_proposals' : ActorMethod<[], Array<Proposal>>,
  'list_stakers' : ActorMethod<[], Array<StakePosition>>,
  'stake' : ActorMethod<[bigint, bigint], string>,
  'total_staked' : ActorMethod<[], bigint>,
  'unstake' : ActorMethod<[], string>,
  'vote' : ActorMethod<[bigint, boolean], string>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
