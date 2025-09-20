import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type DisplayMessageType = {
    'LineDisplayMessage' : { 'pages' : Array<{ 'lines' : Array<string> }> }
  } |
  { 'GenericDisplayMessage' : string };
export interface Icrc21ConsentInfo {
  'metadata' : { 'language' : string },
  'consent_message' : DisplayMessageType,
}
export interface Icrc21ConsentMessageRequest {
  'arg' : Uint8Array | number[],
  'method' : string,
  'user_preferences' : { 'metadata' : { 'language' : string } },
}
export type Icrc21ConsentMessageResponse = { 'Ok' : Icrc21ConsentInfo } |
  {
    'Err' : { 'GenericError' : { 'message' : string, 'error_code' : bigint } } |
      { 'UnsupportedCanisterCall' : {} } |
      { 'ConsentMessageUnavailable' : {} }
  };
export interface Icrc28TrustedOriginsResponse {
  'trusted_origins' : Array<string>,
}
export interface Member {
  'principal' : Principal,
  'last_upgrade' : bigint,
  'tier' : MembershipTier,
  'joined' : bigint,
}
export type MembershipTier = { 'Elite' : null } |
  { 'Premium' : null } |
  { 'Basic' : null };
export interface SupportedStandard { 'url' : string, 'name' : string }
export interface _SERVICE {
  'admin_bulk_delete_data' : ActorMethod<[bigint], string>,
  'admin_bulk_read_data' : ActorMethod<
    [bigint],
    Array<[string, bigint, bigint]>
  >,
  'admin_bulk_update_data' : ActorMethod<[bigint], string>,
  'admin_clear_test_data' : ActorMethod<[], string>,
  'admin_collect' : ActorMethod<
    [Principal, Principal, bigint],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  'admin_generate_bulk_data' : ActorMethod<[bigint], string>,
  'admin_withdraw' : ActorMethod<
    [Principal, Principal, bigint],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  'get_burn_totals' : ActorMethod<[], Array<[string, bigint]>>,
  'get_burn_transactions' : ActorMethod<
    [bigint],
    Array<[string, bigint, bigint]>
  >,
  'get_data_stats' : ActorMethod<
    [],
    {
      'total_test_data' : bigint,
      'total_operations' : bigint,
      'total_metrics' : bigint,
      'memory_usage' : bigint,
    }
  >,
  'get_membership_stats' : ActorMethod<
    [],
    {
      'elite_count' : bigint,
      'premium_count' : bigint,
      'total_members' : bigint,
      'basic_count' : bigint,
    }
  >,
  'get_membership_status' : ActorMethod<[Principal], [] | [Member]>,
  'get_operations_log' : ActorMethod<[bigint], Array<[string, string, bigint]>>,
  'get_performance_metrics' : ActorMethod<[], Array<[string, bigint, bigint]>>,
  'get_price_by_symbol' : ActorMethod<[string, MembershipTier], [] | [bigint]>,
  'get_pricing' : ActorMethod<[Principal, MembershipTier], [] | [bigint]>,
  'get_required_spicy' : ActorMethod<[MembershipTier], bigint>,
  'get_routing_config' : ActorMethod<
    [],
    Array<[string, Array<[string, string]>]>
  >,
  'icrc10_supported_standards' : ActorMethod<[], Array<SupportedStandard>>,
  'icrc21_canister_call_consent_message' : ActorMethod<
    [Icrc21ConsentMessageRequest],
    Icrc21ConsentMessageResponse
  >,
  'icrc28_trusted_origins' : ActorMethod<[], Icrc28TrustedOriginsResponse>,
  'join_membership' : ActorMethod<[MembershipTier], string>,
  'join_membership_with_payment' : ActorMethod<
    [MembershipTier, Principal, string],
    string
  >,
  'list_members' : ActorMethod<[], Array<Member>>,
  'remove_member' : ActorMethod<[Principal], string>,
  'set_admin' : ActorMethod<[Principal], string>,
  'set_price_by_symbol' : ActorMethod<
    [string, MembershipTier, bigint],
    boolean
  >,
  'set_pricing' : ActorMethod<[Principal, MembershipTier, bigint], boolean>,
  'set_routing_address' : ActorMethod<[string, string, string], boolean>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
