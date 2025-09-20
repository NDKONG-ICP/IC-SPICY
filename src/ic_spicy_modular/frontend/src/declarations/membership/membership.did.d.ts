import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Member {
  'principal' : Principal,
  'tier' : MembershipTier,
  'joined' : bigint,
}
export type MembershipTier = { 'Elite' : null } |
  { 'Premium' : null } |
  { 'Basic' : null };
export interface _SERVICE {
  'get_membership_status' : ActorMethod<[Principal], [] | [Member]>,
  'get_required_spicy' : ActorMethod<[MembershipTier], bigint>,
  'join_membership' : ActorMethod<[MembershipTier], string>,
  'list_members' : ActorMethod<[], Array<Member>>,
  'upgrade_membership' : ActorMethod<[MembershipTier], string>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
