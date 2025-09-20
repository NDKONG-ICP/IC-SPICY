export const idlFactory = ({ IDL }) => {
  const Achievement = IDL.Record({
    'id' : IDL.Text,
    'icon' : IDL.Text,
    'name' : IDL.Text,
    'description' : IDL.Text,
    'unlocked_at' : IDL.Opt(IDL.Int),
    'category' : IDL.Text,
    'points' : IDL.Nat,
  });
  const Badge = IDL.Record({
    'id' : IDL.Text,
    'icon' : IDL.Text,
    'name' : IDL.Text,
    'description' : IDL.Text,
    'category' : IDL.Text,
    'rarity' : IDL.Text,
    'requirements' : IDL.Vec(IDL.Text),
  });
  const UserProfile = IDL.Record({
    'bio' : IDL.Text,
    'principal' : IDL.Principal,
    'username' : IDL.Text,
    'join_date' : IDL.Int,
    'avatar_url' : IDL.Opt(IDL.Text),
    'badges' : IDL.Vec(IDL.Text),
    'last_active' : IDL.Int,
    'level' : IDL.Nat,
    'preferences' : IDL.Vec(IDL.Text),
    'display_name' : IDL.Text,
    'experience' : IDL.Nat,
    'achievements' : IDL.Vec(IDL.Text),
    'location' : IDL.Text,
    'social_links' : IDL.Vec(IDL.Text),
  });
  return IDL.Service({
    'addExperience' : IDL.Func([IDL.Nat], [IDL.Bool], []),
    'awardBadge' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'createProfile' : IDL.Func(
        [
          IDL.Text,
          IDL.Text,
          IDL.Text,
          IDL.Opt(IDL.Text),
          IDL.Text,
          IDL.Vec(IDL.Text),
          IDL.Vec(IDL.Text),
        ],
        [IDL.Bool],
        [],
      ),
    'getAchievement' : IDL.Func([IDL.Text], [IDL.Opt(Achievement)], ['query']),
    'getAllAchievements' : IDL.Func([], [IDL.Vec(Achievement)], ['query']),
    'getAllBadges' : IDL.Func([], [IDL.Vec(Badge)], ['query']),
    'getBadge' : IDL.Func([IDL.Text], [IDL.Opt(Badge)], ['query']),
    'getLeaderboard' : IDL.Func([], [IDL.Vec(UserProfile)], ['query']),
    'getProfile' : IDL.Func([IDL.Principal], [IDL.Opt(UserProfile)], ['query']),
    'getProfileStats' : IDL.Func(
        [],
        [
          IDL.Record({
            'total_users' : IDL.Nat,
            'total_achievements' : IDL.Nat,
            'avg_level' : IDL.Float64,
            'total_badges' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'getUserAchievements' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(Achievement)],
        ['query'],
      ),
    'getUserBadges' : IDL.Func([IDL.Principal], [IDL.Vec(Badge)], ['query']),
    'unlockAchievement' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'updateProfile' : IDL.Func(
        [
          IDL.Text,
          IDL.Text,
          IDL.Opt(IDL.Text),
          IDL.Text,
          IDL.Vec(IDL.Text),
          IDL.Vec(IDL.Text),
        ],
        [IDL.Bool],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
