export const idlFactory = ({ IDL }) => {
  const MembershipTier = IDL.Variant({
    'Elite' : IDL.Null,
    'Premium' : IDL.Null,
    'Basic' : IDL.Null,
  });
  const Member = IDL.Record({
    'principal' : IDL.Principal,
    'last_upgrade' : IDL.Nat64,
    'tier' : MembershipTier,
    'joined' : IDL.Nat64,
  });
  const SupportedStandard = IDL.Record({ 'url' : IDL.Text, 'name' : IDL.Text });
  const Icrc21ConsentMessageRequest = IDL.Record({
    'arg' : IDL.Vec(IDL.Nat8),
    'method' : IDL.Text,
    'user_preferences' : IDL.Record({
      'metadata' : IDL.Record({ 'language' : IDL.Text }),
    }),
  });
  const DisplayMessageType = IDL.Variant({
    'LineDisplayMessage' : IDL.Record({
      'pages' : IDL.Vec(IDL.Record({ 'lines' : IDL.Vec(IDL.Text) })),
    }),
    'GenericDisplayMessage' : IDL.Text,
  });
  const Icrc21ConsentInfo = IDL.Record({
    'metadata' : IDL.Record({ 'language' : IDL.Text }),
    'consent_message' : DisplayMessageType,
  });
  const Icrc21ConsentMessageResponse = IDL.Variant({
    'Ok' : Icrc21ConsentInfo,
    'Err' : IDL.Variant({
      'GenericError' : IDL.Record({
        'message' : IDL.Text,
        'error_code' : IDL.Nat,
      }),
      'UnsupportedCanisterCall' : IDL.Record({}),
      'ConsentMessageUnavailable' : IDL.Record({}),
    }),
  });
  const Icrc28TrustedOriginsResponse = IDL.Record({
    'trusted_origins' : IDL.Vec(IDL.Text),
  });
  return IDL.Service({
    'admin_bulk_delete_data' : IDL.Func([IDL.Nat], [IDL.Text], []),
    'admin_bulk_read_data' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat, IDL.Nat64))],
        [],
      ),
    'admin_bulk_update_data' : IDL.Func([IDL.Nat], [IDL.Text], []),
    'admin_clear_test_data' : IDL.Func([], [IDL.Text], []),
    'admin_collect' : IDL.Func(
        [IDL.Principal, IDL.Principal, IDL.Nat],
        [IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : IDL.Text })],
        [],
      ),
    'admin_generate_bulk_data' : IDL.Func([IDL.Nat], [IDL.Text], []),
    'admin_withdraw' : IDL.Func(
        [IDL.Principal, IDL.Principal, IDL.Nat],
        [IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : IDL.Text })],
        [],
      ),
    'get_burn_totals' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat))],
        ['query'],
      ),
    'get_burn_transactions' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat, IDL.Nat64))],
        ['query'],
      ),
    'get_data_stats' : IDL.Func(
        [],
        [
          IDL.Record({
            'total_test_data' : IDL.Nat,
            'total_operations' : IDL.Nat,
            'total_metrics' : IDL.Nat,
            'memory_usage' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'get_membership_stats' : IDL.Func(
        [],
        [
          IDL.Record({
            'elite_count' : IDL.Nat,
            'premium_count' : IDL.Nat,
            'total_members' : IDL.Nat,
            'basic_count' : IDL.Nat,
          }),
        ],
        [],
      ),
    'get_membership_status' : IDL.Func([IDL.Principal], [IDL.Opt(Member)], []),
    'get_operations_log' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text, IDL.Nat64))],
        ['query'],
      ),
    'get_performance_metrics' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat64, IDL.Nat))],
        ['query'],
      ),
    'get_price_by_symbol' : IDL.Func(
        [IDL.Text, MembershipTier],
        [IDL.Opt(IDL.Nat)],
        ['query'],
      ),
    'get_pricing' : IDL.Func(
        [IDL.Principal, MembershipTier],
        [IDL.Opt(IDL.Nat)],
        ['query'],
      ),
    'get_required_spicy' : IDL.Func([MembershipTier], [IDL.Nat], ['query']),
    'get_routing_config' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))))],
        ['query'],
      ),
    'icrc10_supported_standards' : IDL.Func(
        [],
        [IDL.Vec(SupportedStandard)],
        ['query'],
      ),
    'icrc21_canister_call_consent_message' : IDL.Func(
        [Icrc21ConsentMessageRequest],
        [Icrc21ConsentMessageResponse],
        [],
      ),
    'icrc28_trusted_origins' : IDL.Func([], [Icrc28TrustedOriginsResponse], []),
    'join_membership' : IDL.Func([MembershipTier], [IDL.Text], []),
    'join_membership_with_payment' : IDL.Func(
        [MembershipTier, IDL.Principal, IDL.Text],
        [IDL.Text],
        [],
      ),
    'list_members' : IDL.Func([], [IDL.Vec(Member)], []),
    'remove_member' : IDL.Func([IDL.Principal], [IDL.Text], []),
    'set_admin' : IDL.Func([IDL.Principal], [IDL.Text], []),
    'set_price_by_symbol' : IDL.Func(
        [IDL.Text, MembershipTier, IDL.Nat],
        [IDL.Bool],
        [],
      ),
    'set_pricing' : IDL.Func(
        [IDL.Principal, MembershipTier, IDL.Nat],
        [IDL.Bool],
        [],
      ),
    'set_routing_address' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text],
        [IDL.Bool],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
