export const idlFactory = ({ IDL }) => {
  const Plant = IDL.Record({
    'id' : IDL.Nat,
    'growth' : IDL.Nat,
    'name' : IDL.Text,
    'harvested' : IDL.Bool,
    'lastWatered' : IDL.Int,
  });
  const Player = IDL.Record({
    'principal' : IDL.Principal,
    'plants' : IDL.Vec(Plant),
    'name' : IDL.Text,
    'coins' : IDL.Nat,
  });
  return IDL.Service({
    'get_game_status' : IDL.Func([], [IDL.Text], []),
    'get_player' : IDL.Func([], [IDL.Opt(Player)], ['query']),
    'harvest_plant' : IDL.Func([IDL.Nat], [IDL.Bool], []),
    'leaderboard' : IDL.Func([], [IDL.Vec(Player)], ['query']),
    'plant_seed' : IDL.Func([IDL.Text], [IDL.Nat], []),
    'register_player' : IDL.Func([IDL.Text], [], []),
    'water_plant' : IDL.Func([IDL.Nat], [IDL.Bool], []),
  });
};
export const init = ({ IDL }) => { return []; };
