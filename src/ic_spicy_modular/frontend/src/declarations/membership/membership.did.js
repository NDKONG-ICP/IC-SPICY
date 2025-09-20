export const idlFactory = ({ IDL }) => {
  const MembershipTier = IDL.Variant({
    'Elite': IDL.Null,
    'Premium': IDL.Null,
    'Basic': IDL.Null,
  });
  const Member = IDL.Record({
    'principal': IDL.Principal,
    'tier': MembershipTier,
    'joined': IDL.Nat64,
    'last_upgrade': IDL.Nat64,
  });
  return IDL.Service({
    'get_membership_status': IDL.Func([IDL.Principal], [IDL.Opt(Member)], []),
    'get_required_spicy': IDL.Func([MembershipTier], [IDL.Nat], ['query']),
    'join_membership': IDL.Func([MembershipTier], [IDL.Text], []),
    'set_pricing': IDL.Func([IDL.Principal, MembershipTier, IDL.Nat], [IDL.Bool], []),
    'set_price_by_symbol': IDL.Func([IDL.Text, MembershipTier, IDL.Nat], [IDL.Bool], []),
    'get_pricing': IDL.Func([IDL.Principal, MembershipTier], [IDL.Opt(IDL.Nat)], ['query']),
    'get_price_by_symbol': IDL.Func([IDL.Text, MembershipTier], [IDL.Opt(IDL.Nat)], ['query']),
    'join_membership_with_payment': IDL.Func([MembershipTier, IDL.Principal], [IDL.Text], []),
    'admin_withdraw': IDL.Func([IDL.Principal, IDL.Principal, IDL.Nat], [IDL.Variant({ Ok: IDL.Nat, Err: IDL.Text })], []),
    'admin_collect': IDL.Func([IDL.Principal, IDL.Principal, IDL.Nat], [IDL.Variant({ Ok: IDL.Nat, Err: IDL.Text })], []),
    'list_members': IDL.Func([], [IDL.Vec(Member)], []),
  });
};
export const init = ({ IDL }) => { return []; };
