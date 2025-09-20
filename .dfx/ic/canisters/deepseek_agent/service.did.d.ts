import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface _SERVICE {
  'ask_deepseek' : ActorMethod<[string], string>,
  'clear_gateway_url' : ActorMethod<[], string>,
  'get_gateway_url' : ActorMethod<[], [] | [string]>,
  'greet' : ActorMethod<[], string>,
  'has_api_key' : ActorMethod<[], boolean>,
  'set_api_key' : ActorMethod<[string], string>,
  'set_gateway_url' : ActorMethod<[string], string>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
