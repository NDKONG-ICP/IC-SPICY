import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface CreatePaymentRequest {
  'metadata' : [] | [string],
  'description' : string,
  'expires_in_minutes' : [] | [number],
  'currency' : string,
  'amount' : number,
}
export interface PaymentRequest {
  'id' : string,
  'status' : PaymentStatus,
  'user_principal' : string,
  'transaction_hash' : [] | [string],
  'metadata' : [] | [string],
  'description' : string,
  'created_at' : bigint,
  'currency' : string,
  'recipient_address' : string,
  'amount' : number,
  'expires_at' : bigint,
}
export interface PaymentResponse {
  'transaction_hash' : [] | [string],
  'error' : [] | [string],
  'message' : string,
  'success' : boolean,
  'payment_id' : [] | [string],
}
export interface PaymentStats {
  'success_rate' : number,
  'total_volume' : number,
  'total_payments' : bigint,
}
export type PaymentStatus = { 'Failed' : null } |
  { 'Processing' : null } |
  { 'Completed' : null } |
  { 'Expired' : null } |
  { 'Pending' : null };
export interface VerifyPaymentRequest {
  'payment_id' : string,
  'transaction_signature' : string,
}
export interface _SERVICE {
  'activate_membership' : ActorMethod<[string], PaymentResponse>,
  'cancel_payment' : ActorMethod<[string], PaymentResponse>,
  'create_payment' : ActorMethod<[CreatePaymentRequest], PaymentResponse>,
  'get_payment' : ActorMethod<[string], [] | [PaymentRequest]>,
  'get_payment_stats' : ActorMethod<
    [],
    {
      'success_rate' : number,
      'total_volume' : number,
      'total_payments' : bigint,
    }
  >,
  'get_payment_status' : ActorMethod<[string], [] | [PaymentStatus]>,
  'get_solana_status' : ActorMethod<[], string>,
  'get_supported_currencies' : ActorMethod<[], Array<string>>,
  'list_user_payments' : ActorMethod<[string], Array<PaymentRequest>>,
  'verify_payment' : ActorMethod<[VerifyPaymentRequest], PaymentResponse>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
