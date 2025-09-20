export const idlFactory = ({ IDL }) => {
  const Balance = IDL.Record({
    'token' : IDL.Text,
    'user' : IDL.Principal,
    'last_updated' : IDL.Int,
    'amount' : IDL.Nat,
  });
  const Token = IDL.Record({
    'decimals' : IDL.Nat,
    'name' : IDL.Text,
    'total_supply' : IDL.Nat,
    'symbol' : IDL.Text,
  });
  const Transaction = IDL.Record({
    'id' : IDL.Nat,
    'to' : IDL.Principal,
    'token' : IDL.Text,
    'from' : IDL.Principal,
    'timestamp' : IDL.Int,
    'tx_type' : IDL.Text,
    'amount' : IDL.Nat,
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
    'addIcrcToken' : IDL.Func([IDL.Principal], [IDL.Bool], []),
    'allowance' : IDL.Func(
        [IDL.Principal, IDL.Principal, IDL.Text],
        [IDL.Nat],
        ['query'],
      ),
    'approve' : IDL.Func([IDL.Principal, IDL.Text, IDL.Nat], [IDL.Bool], []),
    'getAllBalances' : IDL.Func([IDL.Principal], [IDL.Vec(Balance)], ['query']),
    'getBalance' : IDL.Func([IDL.Principal, IDL.Text], [IDL.Nat], ['query']),
    'getSpicyBalance' : IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'getSupportedTokens' : IDL.Func([], [IDL.Vec(Token)], ['query']),
    'getTransactionHistory' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(Transaction)],
        ['query'],
      ),
    'getWalletStats' : IDL.Func(
        [],
        [
          IDL.Record({
            'total_users' : IDL.Nat,
            'total_transactions' : IDL.Nat,
            'total_volume' : IDL.Nat,
          }),
        ],
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
    'icrcAllowance' : IDL.Func(
        [IDL.Principal, IDL.Principal, IDL.Principal],
        [IDL.Nat],
        [],
      ),
    'icrcApprove' : IDL.Func(
        [IDL.Principal, IDL.Principal, IDL.Nat],
        [IDL.Bool],
        [],
      ),
    'icrcBalance' : IDL.Func([IDL.Principal, IDL.Principal], [IDL.Nat], []),
    'icrcTransfer' : IDL.Func(
        [IDL.Principal, IDL.Principal, IDL.Nat],
        [IDL.Bool],
        [],
      ),
    'icrcTransferFrom' : IDL.Func(
        [IDL.Principal, IDL.Principal, IDL.Principal, IDL.Nat],
        [IDL.Bool],
        [],
      ),
    'isRegistered' : IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    'listIcrcTokens' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'mint' : IDL.Func([IDL.Principal, IDL.Text, IDL.Nat], [IDL.Bool], []),
    'registerUser' : IDL.Func([], [IDL.Bool], []),
    'transfer' : IDL.Func([IDL.Principal, IDL.Text, IDL.Nat], [IDL.Bool], []),
    'transferFrom' : IDL.Func(
        [IDL.Principal, IDL.Principal, IDL.Text, IDL.Nat],
        [IDL.Bool],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
