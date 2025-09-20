import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Achievement {
  'id' : string,
  'icon' : string,
  'name' : string,
  'description' : string,
  'unlocked_at' : [] | [bigint],
  'category' : string,
  'points' : bigint,
}
export interface Badge {
  'id' : string,
  'icon' : string,
  'name' : string,
  'description' : string,
  'category' : string,
  'rarity' : string,
  'requirements' : Array<string>,
}
export interface UserProfile {
  'bio' : string,
  'principal' : Principal,
  'username' : string,
  'join_date' : bigint,
  'avatar_url' : [] | [string],
  'badges' : Array<string>,
  'last_active' : bigint,
  'level' : bigint,
  'preferences' : Array<string>,
  'display_name' : string,
  'experience' : bigint,
  'achievements' : Array<string>,
  'location' : string,
  'social_links' : Array<string>,
}
export interface _SERVICE {
  'addExperience' : ActorMethod<[bigint], boolean>,
  'awardBadge' : ActorMethod<[string], boolean>,
  'createProfile' : ActorMethod<
    [
      string,
      string,
      string,
      [] | [string],
      string,
      Array<string>,
      Array<string>,
    ],
    boolean
  >,
  'getAchievement' : ActorMethod<[string], [] | [Achievement]>,
  'getAllAchievements' : ActorMethod<[], Array<Achievement>>,
  'getAllBadges' : ActorMethod<[], Array<Badge>>,
  'getBadge' : ActorMethod<[string], [] | [Badge]>,
  'getLeaderboard' : ActorMethod<[], Array<UserProfile>>,
  'getProfile' : ActorMethod<[Principal], [] | [UserProfile]>,
  'getProfileStats' : ActorMethod<
    [],
    {
      'total_users' : bigint,
      'total_achievements' : bigint,
      'avg_level' : number,
      'total_badges' : bigint,
    }
  >,
  'getUserAchievements' : ActorMethod<[Principal], Array<Achievement>>,
  'getUserBadges' : ActorMethod<[Principal], Array<Badge>>,
  'unlockAchievement' : ActorMethod<[string], boolean>,
  'updateProfile' : ActorMethod<
    [string, string, [] | [string], string, Array<string>, Array<string>],
    boolean
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
