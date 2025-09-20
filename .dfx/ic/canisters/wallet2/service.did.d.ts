import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Balance {
  'token' : string,
  'user' : Principal,
  'last_updated' : bigint,
  'amount' : bigint,
}
export type DisplayMessageType = {
    'LineDisplayMessage' : { 'pages' : Array<{ 'lines' : Array<string> }> }
  } |
  { 'GenericDisplayMessage' : string };
export interface Icrc21ConsentInfo {
  'metadata' : { 'language' : string },
  'consent_message' : DisplayMessageType,
}
export interface Icrc21ConsentMessageRequest {
  'arg' : Uint8Array | number[],
  'method' : string,
  'user_preferences' : { 'metadata' : { 'language' : string } },
}
export type Icrc21ConsentMessageResponse = { 'Ok' : Icrc21ConsentInfo } |
  {
    'Err' : { 'GenericError' : { 'message' : string, 'error_code' : bigint } } |
      { 'UnsupportedCanisterCall' : {} } |
      { 'ConsentMessageUnavailable' : {} }
  };
export interface Icrc28TrustedOriginsResponse {
  'trusted_origins' : Array<string>,
}
export interface SupportedStandard { 'url' : string, 'name' : string }
export interface Token {
  'decimals' : bigint,
  'name' : string,
  'total_supply' : bigint,
  'symbol' : string,
}
export interface Transaction {
  'id' : bigint,
  'to' : Principal,
  'token' : string,
  'from' : Principal,
  'timestamp' : bigint,
  'tx_type' : string,
  'amount' : bigint,
}
export interface _SERVICE {
  'addIcrcToken' : ActorMethod<[Principal], boolean>,
  'allowance' : ActorMethod<[Principal, Principal, string], bigint>,
  'approve' : ActorMethod<[Principal, string, bigint], boolean>,
  'getAllBalances' : ActorMethod<[Principal], Array<Balance>>,
  'getBalance' : ActorMethod<[Principal, string], bigint>,
  'getSpicyBalance' : ActorMethod<[Principal], bigint>,
  'getSupportedTokens' : ActorMethod<[], Array<Token>>,
  'getTransactionHistory' : ActorMethod<[Principal], Array<Transaction>>,
  'getWalletStats' : ActorMethod<
    [],
    {
      'total_users' : bigint,
      'total_transactions' : bigint,
      'total_volume' : bigint,
    }
  >,
  'icrc10_supported_standards' : ActorMethod<[], Array<SupportedStandard>>,
  'icrc21_canister_call_consent_message' : ActorMethod<
    [Icrc21ConsentMessageRequest],
    Icrc21ConsentMessageResponse
  >,
  'icrc28_trusted_origins' : ActorMethod<[], Icrc28TrustedOriginsResponse>,
  'icrcAllowance' : ActorMethod<[Principal, Principal, Principal], bigint>,
  'icrcApprove' : ActorMethod<[Principal, Principal, bigint], boolean>,
  'icrcBalance' : ActorMethod<[Principal, Principal], bigint>,
  'icrcTransfer' : ActorMethod<[Principal, Principal, bigint], boolean>,
  'icrcTransferFrom' : ActorMethod<
    [Principal, Principal, Principal, bigint],
    boolean
  >,
  'isRegistered' : ActorMethod<[Principal], boolean>,
  'listIcrcTokens' : ActorMethod<[], Array<Principal>>,
  'mint' : ActorMethod<[Principal, string, bigint], boolean>,
  'registerUser' : ActorMethod<[], boolean>,
  'transfer' : ActorMethod<[Principal, string, bigint], boolean>,
  'transferFrom' : ActorMethod<[Principal, Principal, string, bigint], boolean>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
