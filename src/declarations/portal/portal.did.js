export const idlFactory = ({ IDL }) => {
  const Proposal = IDL.Record({
    'id' : IDL.Nat,
    'title' : IDL.Text,
    'creator' : IDL.Principal,
    'executed_at' : IDL.Opt(IDL.Nat64),
    'description' : IDL.Text,
    'created_at' : IDL.Nat64,
    'votes_for' : IDL.Nat,
    'executed' : IDL.Bool,
    'votes_against' : IDL.Nat,
  });
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
    'create_proposal' : IDL.Func([IDL.Text, IDL.Text], [IDL.Nat], []),
    'execute_proposal' : IDL.Func([IDL.Nat], [IDL.Text], []),
    'get_proposal' : IDL.Func([IDL.Nat], [IDL.Opt(Proposal)], ['query']),
    'get_stake' : IDL.Func([], [IDL.Opt(StakePosition)], ['query']),
    'list_proposals' : IDL.Func([], [IDL.Vec(Proposal)], ['query']),
    'list_stakers' : IDL.Func([], [IDL.Vec(StakePosition)], ['query']),
    'stake' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Text], []),
    'total_staked' : IDL.Func([], [IDL.Nat], ['query']),
    'unstake' : IDL.Func([], [IDL.Text], []),
    'vote' : IDL.Func([IDL.Nat, IDL.Bool], [IDL.Text], []),
  });
};
export const init = ({ IDL }) => { return []; };
