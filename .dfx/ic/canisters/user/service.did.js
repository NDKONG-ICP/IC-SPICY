export const idlFactory = ({ IDL }) => {
  const UserPreferences = IDL.Record({
    'theme' : IDL.Text,
    'notifications' : IDL.Bool,
    'privacy_level' : IDL.Text,
    'language' : IDL.Text,
  });
  const UserProfile = IDL.Record({
    'last_login' : IDL.Nat64,
    'name' : IDL.Text,
    'modules_accessed' : IDL.Vec(IDL.Text),
    'created_at' : IDL.Nat64,
    'email' : IDL.Text,
    'preferences' : UserPreferences,
    'referral_code' : IDL.Opt(IDL.Text),
    'engagement' : IDL.Nat,
    'location' : IDL.Text,
    'total_actions' : IDL.Nat,
  });
  const UserStats = IDL.Record({
    'days_active' : IDL.Nat,
    'join_date' : IDL.Text,
    'last_active' : IDL.Text,
    'total_modules' : IDL.Nat,
    'modules_count' : IDL.Nat,
  });
  return IDL.Service({
    'admin_get_activity_log' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Text, IDL.Nat64))],
        [],
      ),
    'admin_get_all_users' : IDL.Func([], [IDL.Vec(UserProfile)], []),
    'admin_get_user_count' : IDL.Func([], [IDL.Nat], []),
    'get_total_users' : IDL.Func([], [IDL.Nat], ['query']),
    'get_user_data' : IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'get_user_stats' : IDL.Func([], [IDL.Opt(UserStats)], ['query']),
    'initialize' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
        [IDL.Text],
        [],
      ),
    'track_module_access' : IDL.Func([IDL.Text], [IDL.Text], []),
    'update_preferences' : IDL.Func([UserPreferences], [IDL.Text], []),
  });
};
export const init = ({ IDL }) => { return []; };
