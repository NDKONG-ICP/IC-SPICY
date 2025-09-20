export const idlFactory = ({ IDL }) => {
  const GamePlant = IDL.Record({
    'id' : IDL.Nat,
    'plantType' : IDL.Text,
    'plantedAt' : IDL.Int,
    'slot' : IDL.Nat,
    'stage' : IDL.Nat,
    'lastWatered' : IDL.Int,
    'needsWater' : IDL.Bool,
  });
  const GamePlayer = IDL.Record({
    'heatBalance' : IDL.Nat,
    'principal' : IDL.Principal,
    'plants' : IDL.Vec(GamePlant),
    'inventory' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat)),
    'name' : IDL.Text,
    'spicyBalance' : IDL.Nat,
    'level' : IDL.Nat,
    'experience' : IDL.Nat,
    'lastSaved' : IDL.Int,
    'unlockedSeeds' : IDL.Vec(IDL.Text),
  });
  const Plant = IDL.Record({
    'id' : IDL.Nat,
    'growth' : IDL.Nat,
    'plantedAt' : IDL.Int,
    'name' : IDL.Text,
    'harvested' : IDL.Bool,
    'lastWatered' : IDL.Int,
  });
  const Player = IDL.Record({
    'principal' : IDL.Principal,
    'plants' : IDL.Vec(Plant),
    'name' : IDL.Text,
    'coins' : IDL.Nat,
    'level' : IDL.Nat,
    'experience' : IDL.Nat,
    'lastAction' : IDL.Int,
  });
  return IDL.Service({
    'ban_player' : IDL.Func([IDL.Principal], [IDL.Text], []),
    'buyGameItem' : IDL.Func([IDL.Text, IDL.Nat, IDL.Text], [IDL.Text], []),
    'getGameLeaderboard' : IDL.Func([], [IDL.Vec(GamePlayer)], ['query']),
    'getGamePlayerData' : IDL.Func([], [IDL.Opt(GamePlayer)], ['query']),
    'get_game_stats' : IDL.Func(
        [],
        [
          IDL.Record({
            'total_players' : IDL.Nat,
            'total_plants' : IDL.Nat,
            'total_coins' : IDL.Nat,
          }),
        ],
        [],
      ),
    'get_game_status' : IDL.Func([], [IDL.Text], []),
    'get_player' : IDL.Func([], [IDL.Opt(Player)], ['query']),
    'harvestGamePlant' : IDL.Func([IDL.Nat, IDL.Nat, IDL.Nat], [IDL.Text], []),
    'harvest_plant' : IDL.Func([IDL.Nat], [IDL.Text], []),
    'initializeGamePlayer' : IDL.Func([], [IDL.Bool], []),
    'leaderboard' : IDL.Func([], [IDL.Vec(Player)], ['query']),
    'plantGameSeed' : IDL.Func([IDL.Nat, IDL.Text, IDL.Nat], [IDL.Text], []),
    'plant_seed' : IDL.Func([IDL.Text], [IDL.Text], []),
    'register_player' : IDL.Func([IDL.Text], [IDL.Text], []),
    'reset_suspicious_activity' : IDL.Func([IDL.Principal], [IDL.Text], []),
    'saveGamePlayerData' : IDL.Func(
        [
          IDL.Nat,
          IDL.Nat,
          IDL.Nat,
          IDL.Nat,
          IDL.Vec(GamePlant),
          IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat)),
        ],
        [IDL.Bool],
        [],
      ),
    'waterGamePlant' : IDL.Func([IDL.Nat], [IDL.Text], []),
    'water_plant' : IDL.Func([IDL.Nat], [IDL.Text], []),
  });
};
export const init = ({ IDL }) => { return []; };
