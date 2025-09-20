export const idlFactory = ({ IDL }) => {
  const StakePosition = IDL.Record({
    'apy' : IDL.Float64,
    'unstaked' : IDL.Bool,
    'principal' : IDL.Principal,
    'last_claimed' : IDL.Nat64,
    'lock_months' : IDL.Nat,
    'staked_at' : IDL.Nat64,
    'rewards' : IDL.Nat,
    'amount' : IDL.Nat64,
  });
  return IDL.Service({
    'claim_rewards' : IDL.Func([], [IDL.Text], []),
    'get_stake' : IDL.Func([], [IDL.Opt(StakePosition)], ['query']),
    'list_stakers' : IDL.Func([], [IDL.Vec(StakePosition)], ['query']),
    'stake' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Text], []),
    'unstake' : IDL.Func([], [IDL.Text], []),
  });
};
export const init = ({ IDL }) => { return []; };
