export const idlFactory = ({ IDL }) => {
  const Permission = IDL.Variant({
    'ReadInventory' : IDL.Null,
    'ReadTransactions' : IDL.Null,
    'ReadOrders' : IDL.Null,
    'ReadAnalytics' : IDL.Null,
    'ReadMembers' : IDL.Null,
    'Admin' : IDL.Null,
    'ReadBalances' : IDL.Null,
  });
  const ApiKeyRequest = IDL.Record({
    'permissions' : IDL.Vec(Permission),
    'name' : IDL.Text,
    'rate_limit' : IDL.Opt(IDL.Nat),
    'expires_in_days' : IDL.Opt(IDL.Nat),
  });
  const ApiKey = IDL.Record({
    'id' : IDL.Text,
    'key' : IDL.Text,
    'permissions' : IDL.Vec(Permission),
    'name' : IDL.Text,
    'rate_limit' : IDL.Nat,
    'created_at' : IDL.Nat64,
    'created_by' : IDL.Principal,
    'last_used' : IDL.Opt(IDL.Nat64),
    'is_active' : IDL.Bool,
    'expires_at' : IDL.Opt(IDL.Nat64),
    'usage_count' : IDL.Nat,
  });
  const ApiResponse_4 = IDL.Variant({ 'Ok' : ApiKey, 'Err' : IDL.Text });
  const AnalyticsData = IDL.Record({
    'daily_transactions' : IDL.Nat,
    'total_transactions' : IDL.Nat,
    'timestamp' : IDL.Nat64,
    'total_volume' : IDL.Nat,
    'active_users' : IDL.Nat,
  });
  const ApiResponse_3 = IDL.Variant({ 'Ok' : AnalyticsData, 'Err' : IDL.Text });
  const ApiResponse_2 = IDL.Variant({
    'Ok' : IDL.Record({
      'rate_limit_remaining' : IDL.Nat,
      'last_used' : IDL.Opt(IDL.Nat64),
      'usage_count' : IDL.Nat,
    }),
    'Err' : IDL.Text,
  });
  const TransactionData = IDL.Record({
    'id' : IDL.Nat,
    'to' : IDL.Principal,
    'fee' : IDL.Opt(IDL.Nat),
    'token' : IDL.Text,
    'block_hash' : IDL.Opt(IDL.Text),
    'from' : IDL.Principal,
    'timestamp' : IDL.Int,
    'tx_type' : IDL.Text,
    'amount' : IDL.Nat,
  });
  const PaginatedTransactions = IDL.Record({
    'page' : IDL.Nat,
    'limit' : IDL.Nat,
    'transactions' : IDL.Vec(TransactionData),
    'total_count' : IDL.Nat,
    'has_next' : IDL.Bool,
  });
  const ApiResponse_1 = IDL.Variant({
    'Ok' : PaginatedTransactions,
    'Err' : IDL.Text,
  });
  const ApiResponse = IDL.Variant({
    'Ok' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat)),
    'Err' : IDL.Text,
  });
  const HttpRequest = IDL.Record({
    'url' : IDL.Text,
    'method' : IDL.Text,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
  });
  const HttpResponse = IDL.Record({
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'status_code' : IDL.Nat16,
  });
  return IDL.Service({
    'createApiKey' : IDL.Func([ApiKeyRequest], [ApiResponse_4], []),
    'getAnalytics' : IDL.Func([IDL.Text], [ApiResponse_3], ['query']),
    'getApiUsage' : IDL.Func([IDL.Text], [ApiResponse_2], ['query']),
    'getTransactions' : IDL.Func(
        [
          IDL.Text,
          IDL.Opt(IDL.Nat),
          IDL.Opt(IDL.Nat),
          IDL.Opt(IDL.Principal),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Int),
          IDL.Opt(IDL.Int),
        ],
        [ApiResponse_1],
        ['query'],
      ),
    'getUserBalances' : IDL.Func(
        [IDL.Text, IDL.Principal],
        [ApiResponse],
        ['query'],
      ),
    'http_request' : IDL.Func([HttpRequest], [HttpResponse], []),
    'listApiKeys' : IDL.Func([], [IDL.Vec(ApiKey)], []),
    'revokeApiKey' : IDL.Func([IDL.Text], [IDL.Bool], []),
    'validateKey' : IDL.Func([IDL.Text], [IDL.Bool], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
