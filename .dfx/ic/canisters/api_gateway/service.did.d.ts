import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AnalyticsData {
  'daily_transactions' : bigint,
  'total_transactions' : bigint,
  'timestamp' : bigint,
  'total_volume' : bigint,
  'active_users' : bigint,
}
export interface ApiKey {
  'id' : string,
  'key' : string,
  'permissions' : Array<Permission>,
  'name' : string,
  'rate_limit' : bigint,
  'created_at' : bigint,
  'created_by' : Principal,
  'last_used' : [] | [bigint],
  'is_active' : boolean,
  'expires_at' : [] | [bigint],
  'usage_count' : bigint,
}
export interface ApiKeyRequest {
  'permissions' : Array<Permission>,
  'name' : string,
  'rate_limit' : [] | [bigint],
  'expires_in_days' : [] | [bigint],
}
export type ApiResponse = { 'Ok' : Array<[string, bigint]> } |
  { 'Err' : string };
export type ApiResponse_1 = { 'Ok' : PaginatedTransactions } |
  { 'Err' : string };
export type ApiResponse_2 = {
    'Ok' : {
      'rate_limit_remaining' : bigint,
      'last_used' : [] | [bigint],
      'usage_count' : bigint,
    }
  } |
  { 'Err' : string };
export type ApiResponse_3 = { 'Ok' : AnalyticsData } |
  { 'Err' : string };
export type ApiResponse_4 = { 'Ok' : ApiKey } |
  { 'Err' : string };
export interface HttpRequest {
  'url' : string,
  'method' : string,
  'body' : Uint8Array | number[],
  'headers' : Array<[string, string]>,
}
export interface HttpResponse {
  'body' : Uint8Array | number[],
  'headers' : Array<[string, string]>,
  'status_code' : number,
}
export interface PaginatedTransactions {
  'page' : bigint,
  'limit' : bigint,
  'transactions' : Array<TransactionData>,
  'total_count' : bigint,
  'has_next' : boolean,
}
export type Permission = { 'ReadInventory' : null } |
  { 'ReadTransactions' : null } |
  { 'ReadOrders' : null } |
  { 'ReadAnalytics' : null } |
  { 'ReadMembers' : null } |
  { 'Admin' : null } |
  { 'ReadBalances' : null };
export interface TransactionData {
  'id' : bigint,
  'to' : Principal,
  'fee' : [] | [bigint],
  'token' : string,
  'block_hash' : [] | [string],
  'from' : Principal,
  'timestamp' : bigint,
  'tx_type' : string,
  'amount' : bigint,
}
export interface _SERVICE {
  'createApiKey' : ActorMethod<[ApiKeyRequest], ApiResponse_4>,
  'getAnalytics' : ActorMethod<[string], ApiResponse_3>,
  'getApiUsage' : ActorMethod<[string], ApiResponse_2>,
  'getTransactions' : ActorMethod<
    [
      string,
      [] | [bigint],
      [] | [bigint],
      [] | [Principal],
      [] | [string],
      [] | [bigint],
      [] | [bigint],
    ],
    ApiResponse_1
  >,
  'getUserBalances' : ActorMethod<[string, Principal], ApiResponse>,
  'http_request' : ActorMethod<[HttpRequest], HttpResponse>,
  'listApiKeys' : ActorMethod<[], Array<ApiKey>>,
  'revokeApiKey' : ActorMethod<[string], boolean>,
  'validateKey' : ActorMethod<[string], boolean>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
