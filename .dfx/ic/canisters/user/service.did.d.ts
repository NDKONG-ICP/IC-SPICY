import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface UserPreferences {
  'theme' : string,
  'notifications' : boolean,
  'privacy_level' : string,
  'language' : string,
}
export interface UserProfile {
  'last_login' : bigint,
  'name' : string,
  'modules_accessed' : Array<string>,
  'created_at' : bigint,
  'email' : string,
  'preferences' : UserPreferences,
  'referral_code' : [] | [string],
  'engagement' : bigint,
  'location' : string,
  'total_actions' : bigint,
}
export interface UserStats {
  'days_active' : bigint,
  'join_date' : string,
  'last_active' : string,
  'total_modules' : bigint,
  'modules_count' : bigint,
}
export interface _SERVICE {
  'admin_get_activity_log' : ActorMethod<
    [bigint],
    Array<[Principal, string, bigint]>
  >,
  'admin_get_all_users' : ActorMethod<[], Array<UserProfile>>,
  'admin_get_user_count' : ActorMethod<[], bigint>,
  'get_total_users' : ActorMethod<[], bigint>,
  'get_user_data' : ActorMethod<[], [] | [UserProfile]>,
  'get_user_stats' : ActorMethod<[], [] | [UserStats]>,
  'initialize' : ActorMethod<[string, string, [] | [string]], string>,
  'track_module_access' : ActorMethod<[string], string>,
  'update_preferences' : ActorMethod<[UserPreferences], string>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
