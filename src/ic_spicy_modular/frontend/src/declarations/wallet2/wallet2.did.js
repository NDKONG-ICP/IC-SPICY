export const idlFactory = ({ IDL }) => {
  // Types
  const Principal = IDL.Principal;
  const Balance = IDL.Record({
    user: Principal,
    token: IDL.Text,
    amount: IDL.Nat,
    last_updated: IDL.Int,
  });
  const Transaction = IDL.Record({
    id: IDL.Nat,
    from: Principal,
    to: Principal,
    token: IDL.Text,
    amount: IDL.Nat,
    timestamp: IDL.Int,
    tx_type: IDL.Text,
  });

  // ICRC types (minimal subset)
  const Account = IDL.Record({ owner: Principal, subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)) });
  const TransferArg = IDL.Record({
    to: Account,
    amount: IDL.Nat,
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
  });
  const TransferError = IDL.Variant({
    GenericError: IDL.Record({ message: IDL.Text, error_code: IDL.Nat }),
    TemporarilyUnavailable: IDL.Null,
    BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    BadFee: IDL.Record({ expected_fee: IDL.Nat }),
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
    TooOld: IDL.Null,
    CreatedInFuture: IDL.Null,
    BadRecipient: IDL.Record({ message: IDL.Text }),
  });
  const TransferResult = IDL.Variant({ Ok: IDL.Nat, Err: TransferError });
  const ApproveArgs = IDL.Record({
    spender: Account,
    amount: IDL.Nat,
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
    expires_at: IDL.Opt(IDL.Nat64),
    expected_allowance: IDL.Opt(IDL.Nat),
  });
  const AllowanceArgs = IDL.Record({ account: Account, spender: Account });
  const Allowance = IDL.Record({ allowance: IDL.Nat, expires_at: IDL.Opt(IDL.Nat64) });
  const ApproveError = IDL.Variant({
    GenericError: IDL.Record({ message: IDL.Text, error_code: IDL.Nat }),
    TemporarilyUnavailable: IDL.Null,
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    BadFee: IDL.Record({ expected_fee: IDL.Nat }),
    AllowanceChanged: IDL.Record({ current_allowance: IDL.Nat }),
    Expired: IDL.Record({ ledger_time: IDL.Nat64 }),
    TooOld: IDL.Null,
    CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
  });
  const ApproveResult = IDL.Variant({ Ok: IDL.Nat, Err: ApproveError });
  const TransferFromArgs = IDL.Record({
    spender_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from: Account,
    to: Account,
    amount: IDL.Nat,
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
  });
  const TransferFromError = TransferError;
  const TransferFromResult = IDL.Variant({ Ok: IDL.Nat, Err: TransferFromError });

  return IDL.Service({
    // Core wallet
    registerUser: IDL.Func([], [IDL.Bool], []),
    isRegistered: IDL.Func([Principal], [IDL.Bool], ['query']),
    getBalance: IDL.Func([Principal, IDL.Text], [IDL.Nat], ['query']),
    getSpicyBalance: IDL.Func([Principal], [IDL.Nat], ['query']),
    getAllBalances: IDL.Func([Principal], [IDL.Vec(Balance)], ['query']),
    transfer: IDL.Func([Principal, IDL.Text, IDL.Nat], [IDL.Bool], []),
    mint: IDL.Func([Principal, IDL.Text, IDL.Nat], [IDL.Bool], []),
    getTransactionHistory: IDL.Func([Principal], [IDL.Vec(Transaction)], ['query']),
    getSupportedTokens: IDL.Func([], [IDL.Vec(IDL.Record({ symbol: IDL.Text, name: IDL.Text, decimals: IDL.Nat, total_supply: IDL.Nat }))], ['query']),
    getWalletStats: IDL.Func([], [IDL.Record({ total_users: IDL.Nat, total_transactions: IDL.Nat, total_volume: IDL.Nat })], ['query']),

    // Allowances
    approve: IDL.Func([Principal, IDL.Text, IDL.Nat], [IDL.Bool], []),
    allowance: IDL.Func([Principal, Principal, IDL.Text], [IDL.Nat], ['query']),
    transferFrom: IDL.Func([Principal, Principal, IDL.Text, IDL.Nat], [IDL.Bool], []),

    // ICRC registry and wrappers
    addIcrcToken: IDL.Func([Principal], [IDL.Bool], []),
    listIcrcTokens: IDL.Func([], [IDL.Vec(Principal)], ['query']),
    icrcBalance: IDL.Func([Principal, Principal], [IDL.Nat], []),
    icrcTransfer: IDL.Func([Principal, Principal, IDL.Nat], [IDL.Bool], []),
    icrcApprove: IDL.Func([Principal, Principal, IDL.Nat], [IDL.Bool], []),
    icrcAllowance: IDL.Func([Principal, Principal, Principal], [IDL.Nat], []),
    icrcTransferFrom: IDL.Func([Principal, Principal, Principal, IDL.Nat], [IDL.Bool], []),
  });
};
export const init = ({ IDL }) => { return []; };
